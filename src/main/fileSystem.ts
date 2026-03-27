import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import mime from 'mime-types'

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
  // 디렉토리 목록 읽기 (일괄 이름 변경에서 사용)
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
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
      return { success: false, error: String(err) }
    }
  })

  // 홈 디렉토리
  ipcMain.handle('fs:homeDir', () => os.homedir())

  // 파일/폴더 삭제 (휴지통) - 중복 탐지에서 사용
  ipcMain.handle('fs:delete', async (_, filePaths: string[]) => {
    try {
      for (const p of filePaths) {
        await shell.trashItem(p)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // 일괄 이름 변경
  ipcMain.handle('fs:bulkRename', async (_, items: { path: string; newName: string }[]) => {
    const results: { path: string; success: boolean; newPath?: string; error?: string }[] = []
    for (const item of items) {
      const name = item.newName
      // 경로 구분자, .. 포함 시 경로 탐색 공격 차단
      if (!name || name.includes('/') || name.includes('\\') || name === '..' || name === '.') {
        results.push({ path: item.path, success: false, error: '유효하지 않은 파일명' })
        continue
      }
      try {
        const dir = path.dirname(item.path)
        const newPath = path.join(dir, name)
        // 최종 경로가 동일 디렉터리 안에 있는지 재확인
        if (path.dirname(newPath) !== dir) {
          results.push({ path: item.path, success: false, error: '디렉터리 이탈 차단' })
          continue
        }
        fs.renameSync(item.path, newPath)
        results.push({ path: item.path, success: true, newPath })
      } catch (err) {
        results.push({ path: item.path, success: false, error: String(err) })
      }
    }
    return results
  })

  // 폴더 크기 계산 - 디스크 분석
  ipcMain.handle('fs:folderSize', async (_, dirPath: string) => {
    try {
      const size = calcFolderSize(dirPath)
      return { success: true, size }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // 파일 타입별 통계 - 디스크 분석
  ipcMain.handle('fs:typeStats', async (_, dirPath: string) => {
    try {
      const stats = calcTypeStats(dirPath)
      return { success: true, data: stats }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // 외부 앱으로 열기
  ipcMain.handle('fs:open', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // 파일 탐색기에서 표시
  ipcMain.handle('fs:showInExplorer', async (_, filePath: string) => {
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
