/**
 * jsonStore.ts — JSON 파일 안전 I/O 유틸리티
 *
 * 두 가지 보호를 제공합니다.
 *  1. Atomic write: 임시 파일에 쓴 뒤 rename → 쓰기 도중 크래시 시 파일 손상 없음
 *  2. Per-file write lock: 같은 파일의 동시 저장을 직렬화 → read-modify-write 충돌 방지
 *
 * 사용 패턴:
 *  - 인메모리 캐시 O (todo, snippets, quickNotes):
 *      await writeJsonLocked(path, data)
 *  - 인메모리 캐시 X (notes, tags):
 *      await updateJson(path, fallback, current => { ...current, newKey: val })
 */

import fs from 'fs'
import log from './logger'

// 파일 경로 → 진행 중인 write Promise 체인
// 새 write는 체인 끝에 추가되어 자동으로 직렬화됨
const writeLocks = new Map<string, Promise<void>>()

/**
 * filePath에 대한 write lock을 획득하고 fn을 실행합니다.
 * 같은 경로의 동시 호출은 앞선 작업이 끝날 때까지 대기합니다.
 */
async function withWriteLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(filePath) ?? Promise.resolve()

  let release!: () => void
  const next = new Promise<void>(resolve => { release = resolve })
  writeLocks.set(filePath, next)

  try {
    await prev       // 앞선 write가 끝날 때까지 대기
    return await fn()
  } finally {
    release()
    // 자신이 마지막 write일 때만 Map에서 제거 (후속 write가 등록됐으면 유지)
    if (writeLocks.get(filePath) === next) writeLocks.delete(filePath)
  }
}

/**
 * 임시 파일에 쓴 뒤 rename — OS 수준 원자적 교체를 보장합니다.
 * 쓰기 도중 프로세스가 종료되어도 원본 파일은 손상되지 않습니다.
 */
async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`
  try {
    await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
    await fs.promises.rename(tmp, filePath)
  } catch (err) {
    try { await fs.promises.unlink(tmp) } catch { /* 임시 파일이 없으면 무시 */ }
    throw err
  }
}

// ─── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * JSON 파일을 동기적으로 읽습니다. (읽기는 동시 접근 안전)
 * 파일이 없거나 파싱 실패 시 fallback을 반환합니다.
 * 인메모리 캐시 초기화(앱 시작 시)에 사용합니다.
 */
export function readJsonSync<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn(`[jsonStore] 읽기 실패: ${filePath}`, err)
    }
    return fallback
  }
}

/**
 * 락을 획득한 뒤 atomic write를 수행합니다.
 * 인메모리 캐시가 있는 파일(todo, snippets, quickNotes)의 save()에 사용합니다.
 * JS 단일 스레드 특성상 캐시 수정은 이미 직렬화되므로,
 * 이 함수는 디스크 write 순서만 보장합니다.
 */
export async function writeJsonLocked(filePath: string, data: unknown): Promise<void> {
  await withWriteLock(filePath, () => atomicWrite(filePath, data))
}

/**
 * 락 안에서 읽기 → 수정 → atomic write를 수행합니다.
 * 인메모리 캐시 없이 매번 파일을 읽는 파일(notes, tags)의 write 핸들러에 사용합니다.
 * 두 요청이 동시에 도달해도 read-modify-write 사이클이 순서대로 실행됩니다.
 */
export async function updateJson<T>(
  filePath: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
): Promise<T> {
  return withWriteLock(filePath, async () => {
    let current: T
    try {
      current = JSON.parse(await fs.promises.readFile(filePath, 'utf-8')) as T
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warn(`[jsonStore] 읽기 실패: ${filePath}`, err)
      }
      current = fallback
    }
    const updated = await updater(current)
    await atomicWrite(filePath, updated)
    return updated
  })
}
