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


export function registerFileSystemHandlers(): void {
  // 디렉토리 목록 읽기
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) {
      return { success: false, error: '유효하지 않은 경로' }
    }
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      const result: FileEntry[] = []

      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry.name)
          const stats = fs.statSync(fullPath)
          const ext = path.extname(entry.name).toLowerCase()

          result.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtimeMs,
            created: stats.birthtimeMs,
            extension: ext,
            mimeType: mime.lookup(ext) || false,
            tags: []
          })
        } catch {
          // 접근 불가 파일 스킵
        }
      }

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
        const newPath = path.join(dir, item.newName)
        // 최종 경로가 동일 디렉터리 안에 있는지 재확인
        if (path.dirname(newPath) !== dir) {
          results.push({ path: item.path, success: false, error: '디렉터리 이탈 차단' })
          continue
        }
        fs.renameSync(item.path, newPath)
        results.push({ path: item.path, success: true, newPath })
      } catch (err) {
        logIpcError('fs:bulkRename', err, { path: item.path })
        results.push({ path: item.path, success: false, error: String(err) })
      }
    }
    log.debug(`[fs:bulkRename] ${results.filter(r => r.success).length}/${results.length} 성공`)
    return results
  })

  // 폴더 크기 계산
  ipcMain.handle('fs:folderSize', async (_, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) return { success: false, error: '유효하지 않은 경로' }
    try {
      const size = calcFolderSize(dirPath)
      return { success: true, size }
    } catch (err) {
      logIpcError('fs:folderSize', err, { dirPath })
      return { success: false, error: String(err) }
    }
  })

  // 파일 타입별 통계
  ipcMain.handle('fs:typeStats', async (_, dirPath: string) => {
    if (typeof dirPath !== 'string' || !dirPath) return { success: false, error: '유효하지 않은 경로' }
    try {
      const stats = calcTypeStats(dirPath)
      return { success: true, data: stats }
    } catch (err) {
      logIpcError('fs:typeStats', err, { dirPath })
      return { success: false, error: String(err) }
    }
  })

  // 외부 앱으로 열기
  ipcMain.handle('fs:open', async (_, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath) return { success: false, error: '유효하지 않은 경로' }
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

function calcFolderSize(dirPath: string): number {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          total += calcFolderSize(fullPath)
        } else {
          total += fs.statSync(fullPath).size
        }
      } catch {}
    }
  } catch {}
  return total
}

function calcTypeStats(dirPath: string): Record<string, { count: number; size: number }> {
  const stats: Record<string, { count: number; size: number }> = {}

  function walk(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            walk(fullPath)
          } else {
            const ext = path.extname(entry.name).toLowerCase() || '.unknown'
            const size = fs.statSync(fullPath).size
            if (!stats[ext]) stats[ext] = { count: 0, size: 0 }
            stats[ext].count++
            stats[ext].size += size
          }
        } catch {}
      }
    } catch {}
  }

  walk(dirPath)
  return stats
}
