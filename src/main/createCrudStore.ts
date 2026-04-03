/**
 * createCrudStore — IPC CRUD 핸들러 팩토리
 *
 * main/ 프로세스의 CRUD 모듈(todo, quickNotes, snippets, emailTemplates,
 * reminders, smartFolders)이 공유하는 보일러플레이트를 제거합니다.
 *
 * 두 가지 모드를 지원합니다:
 *  - cached (기본): 인메모리 배열 + writeJsonLocked  (todo, quickNotes, snippets)
 *  - uncached:       매 요청마다 파일 읽기/쓰기       (reminders, smartFolders)
 *
 * 사용 패턴:
 *   const store = createCrudStore<Item>({ ... })
 *   export function registerXxxHandlers() { store.register() }
 */

import { ipcMain } from 'electron'
import { z, ZodType } from 'zod'
import log from './logger'
import { readJsonSync, writeJsonLocked } from './jsonStore'

interface CrudStoreConfig<T extends { id: string }> {
  /** IPC 채널 접두사 (e.g. 'todo', 'snippets') */
  channel: string
  /** JSON 파일 절대 경로를 반환하는 함수 */
  getPath: () => string
  /** 저장용 Zod 스키마 (id optional — 신규 생성 시 자동 부여) */
  saveSchema: ZodType
  /** 신규 항목 생성 시 기본값을 채우는 함수 */
  createItem: (validated: Record<string, unknown>) => T
  /** 기존 항목 업데이트 시 병합하는 함수 (기본: spread merge) */
  updateItem?: (existing: T, validated: Record<string, unknown>) => T
  /** true이면 매 요청마다 파일에서 읽음 (기본: false, 인메모리 캐시) */
  uncached?: boolean
}

export function createCrudStore<T extends { id: string }>(config: CrudStoreConfig<T>) {
  const {
    channel,
    getPath,
    saveSchema,
    createItem,
    updateItem = (existing, data) => ({ ...existing, ...data }),
    uncached = false,
  } = config

  let items: T[] = []
  const IdSchema = z.string().min(1)

  function load(): T[] {
    const raw = readJsonSync<unknown>(getPath(), [])
    items = Array.isArray(raw) ? raw : []
    return items
  }

  async function save(): Promise<void> {
    try {
      await writeJsonLocked(getPath(), items)
    } catch (err) {
      log.error(`[${channel}] 파일 저장 실패`, err)
    }
  }

  function getItems(): T[] {
    return uncached ? load() : items
  }

  async function saveItems(): Promise<void> {
    if (uncached) {
      try {
        await writeJsonLocked(getPath(), items)
      } catch (err) {
        log.error(`[${channel}] 파일 저장 실패`, err)
      }
    } else {
      await save()
    }
  }

  function register(): void {
    if (!uncached) load()

    ipcMain.handle(`${channel}:get`, () => getItems())

    ipcMain.handle(`${channel}:save`, async (_, raw: unknown) => {
      const result = saveSchema.safeParse(raw)
      if (!result.success) {
        log.warn(`[${channel}:save] 유효하지 않은 입력`, result.error.flatten())
        return { success: false, error: '유효하지 않은 데이터' }
      }
      const data = result.data as Record<string, unknown>
      const current = getItems()
      const idx = current.findIndex(i => i.id === data.id)
      if (idx >= 0) {
        items[idx] = updateItem(items[idx], data)
      } else {
        items.unshift(createItem(data))
      }
      await saveItems()
      return items
    })

    ipcMain.handle(`${channel}:delete`, async (_, raw: unknown) => {
      const result = IdSchema.safeParse(raw)
      if (!result.success) return { success: false, error: '유효하지 않은 id' }
      const current = getItems()
      items = current.filter(i => i.id !== result.data)
      await saveItems()
      log.debug(`[${channel}:delete] id=${result.data}`)
      return items
    })
  }

  return { register, getItems, load }
}

/** 고유 ID 생성 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
