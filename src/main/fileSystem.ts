import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import mime from 'mime-types'
import { z } from 'zod'
import log, { logIpcError } from './logger'
import { isValidFileName } from '../shared/utils'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  created: number
  extension: string
  mimeType: string | false
  tags?: string[]
}

// 파일 N개마다 진행률 이벤트 발송 (IPC 과부하 방지)
const PROGRESS_INTERVAL = 200

export function registerFileSystemHandlers(): void {
  // 디렉토리 목록 읽기
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) {
      return { success: false, error: '유효하지 않은 경로' }
    }
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      const settled = await Promise.allSettled(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name)
          const stats = await fs.promises.stat(fullPath)
          const ext = path.extname(entry.name).toLowerCase()
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtimeMs,
            created: stats.birthtimeMs,
            extension: ext,
            mimeType: mime.lookup(ext) || false,
            tags: [],
          } as FileEntry
        })
      )
      const result = settled
        .filter((r): r is PromiseFulfilledResult<FileEntry> => r.status === 'fulfilled')
        .map((r) => r.value)
      return { success: true, data: result }
    } catch (err) {
      logIpcError('fs:readDir', err, { dirPath })
      return { success: false, error: String(err) }
    }
  })

  // 홈 디렉토리
  ipcMain.handle('fs:homeDir', () => os.homedir())

  // 파일/폴더 삭제 (휴지통)
  ipcMain.handle('fs:delete', async (_, filePaths: unknown) => {
    const result = z.array(z.string().min(1)).safeParse(filePaths)
    if (!result.success) return { success: false, error: '유효하지 않은 경로 배열' }
    try {
      for (const p of result.data) {
        await shell.trashItem(p)
      }
      log.debug(`[fs:delete] ${result.data.length}개 삭제`)
      return { success: true }
    } catch (err) {
      logIpcError('fs:delete', err)
      return { success: false, error: String(err) }
    }
  })

  // 일괄 이름 변경
  ipcMain.handle('fs:bulkRename', async (_, items: unknown) => {
    const ItemSchema = z.array(z.object({ path: z.string().min(1), newName: z.string().min(1) }))
    const parsed = ItemSchema.safeParse(items)
    if (!parsed.success) return [{ path: '', success: false, error: '유효하지 않은 입력' }]

    const results: { path: string; success: boolean; newPath?: string; error?: string }[] = []

    for (const item of parsed.data) {
      const check = isValidFileName(item.newName)
      if (!check.valid) {
        log.warn(`[fs:bulkRename] 유효하지 않은 파일명: "${item.newName}" — ${check.reason}`)
        results.push({ path: item.path, success: false, error: check.reason ?? '유효하지 않은 파일명' })
        continue
      }
      try {
        const dir = path.dirname(item.path)
        const resolved = path.resolve(dir, item.newName)
        if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
          results.push({ path: item.path, success: false, error: '디렉터리 이탈 차단' })
          continue
        }
        const newPath = resolved
        await fs.promises.rename(item.path, newPath)
        results.push({ path: item.path, success: true, newPath })
      } catch (err) {
        logIpcError('fs:bulkRename', err, { path: item.path })
        results.push({ path: item.path, success: false, error: String(err) })
      }
    }
    log.debug(`[fs:bulkRename] ${results.filter(r => r.success).length}/${results.length} 성공`)
    return results
  })

  // 폴더 크기 계산 (진행률: fs:folderSize:progress)
  ipcMain.handle('fs:folderSize', async (event, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) return { success: false, error: '유효하지 않은 경로' }
    try {
      const size = await calcFolderSize(dirPath, (scanned) => {
        if (!event.sender.isDestroyed()) event.sender.send('fs:folderSize:progress', scanned)
      })
      return { success: true, size }
    } catch (err) {
      logIpcError('fs:folderSize', err, { dirPath })
      return { success: false, error: String(err) }
    }
  })

  // 파일 타입별 통계 (진행률: fs:typeStats:progress)
  ipcMain.handle('fs:typeStats', async (event, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) return { success: false, error: '유효하지 않은 경로' }
    try {
      const stats = await calcTypeStats(dirPath, (scanned) => {
        if (!event.sender.isDestroyed()) event.sender.send('fs:typeStats:progress', scanned)
      })
      return { success: true, data: stats }
    } catch (err) {
      logIpcError('fs:typeStats', err, { dirPath })
      return { success: false, error: String(err) }
    }
  })

  // 외부 앱으로 열기
  ipcMain.handle('fs:open', async (_, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath) return { success: false, error: '유효하지 않은 경로' }
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (err) {
      logIpcError('fs:open', err, { filePath })
      return { success: false, error: String(err) }
    }
  })

  // 파일 탐색기에서 표시
  ipcMain.handle('fs:showInExplorer', async (_, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath) return { success: false, error: '유효하지 않은 경로' }
    shell.showItemInFolder(filePath)
    return { success: true }
  })
}

// counter 객체를 공유해 재귀 호출 간 스캔 수를 누적
async function calcFolderSize(
  dirPath: string,
  onProgress?: (scanned: number) => void,
  counter: { n: number } = { n: 0 }
): Promise<number> {
  let total = 0
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          total += await calcFolderSize(fullPath, onProgress, counter)
        } else {
          total += (await fs.promises.stat(fullPath)).size
          counter.n++
          if (onProgress && counter.n % PROGRESS_INTERVAL === 0) onProgress(counter.n)
        }
      } catch {}
    }
  } catch {}
  return total
}

async function calcTypeStats(
  dirPath: string,
  onProgress?: (scanned: number) => void
): Promise<Record<string, { count: number; size: number }>> {
  const stats: Record<string, { count: number; size: number }> = {}
  let scanned = 0

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            await walk(fullPath)
          } else {
            const ext = path.extname(entry.name).toLowerCase() || '.unknown'
            const size = (await fs.promises.stat(fullPath)).size
            if (!stats[ext]) stats[ext] = { count: 0, size: 0 }
            stats[ext].count++
            stats[ext].size += size
            scanned++
            if (onProgress && scanned % PROGRESS_INTERVAL === 0) onProgress(scanned)
          }
        } catch {}
      }
    } catch {}
  }

  await walk(dirPath)
  return stats
}
