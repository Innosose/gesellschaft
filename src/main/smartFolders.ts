import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import log from './logger'

export interface SmartFolder {
  id: string
  name: string
  options: {
    query: string
    rootPath: string
    extensions?: string[]
    minSize?: number
    maxSize?: number
    includeFiles: boolean
    includeDirs: boolean
    caseSensitive?: boolean
    regex?: boolean
    contentSearch?: boolean
  }
}

const SmartFolderSchema = z.object({
  id:   z.string().min(1),
  name: z.string().min(1).max(200),
  options: z.object({
    query:         z.string().max(500),
    rootPath:      z.string().min(1),
    extensions:    z.array(z.string()).optional(),
    minSize:       z.number().nonnegative().optional(),
    maxSize:       z.number().nonnegative().optional(),
    includeFiles:  z.boolean(),
    includeDirs:   z.boolean(),
    caseSensitive: z.boolean().optional(),
    regex:         z.boolean().optional(),
    contentSearch: z.boolean().optional(),
  }),
})

const SmartFolderIdSchema = z.string().min(1)

function getSmartFoldersPath(): string {
  return path.join(app.getPath('userData'), 'smartFolders.json')
}

function loadSmartFolders(): SmartFolder[] {
  try {
    const data = fs.readFileSync(getSmartFoldersPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('[smartFolders] 파일 로드 실패', err)
    }
    return []
  }
}

function saveSmartFolders(items: SmartFolder[]): void {
  try {
    fs.writeFileSync(getSmartFoldersPath(), JSON.stringify(items, null, 2))
  } catch (err) {
    log.error('[smartFolders] 파일 저장 실패', err)
  }
}

export function registerSmartFoldersHandlers(): void {
  ipcMain.handle('smartFolders:get', () => loadSmartFolders())

  ipcMain.handle('smartFolders:save', (_, raw: unknown) => {
    const result = SmartFolderSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[smartFolders:save] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 스마트 폴더 데이터' }
    }
    const folder = result.data
    const items = loadSmartFolders()
    const idx = items.findIndex(i => i.id === folder.id)
    if (idx >= 0) {
      items[idx] = folder
    } else {
      items.push(folder)
    }
    saveSmartFolders(items)
    log.debug(`[smartFolders:save] id=${folder.id} name="${folder.name}"`)
    return items
  })

  ipcMain.handle('smartFolders:delete', (_, raw: unknown) => {
    const result = SmartFolderIdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const items = loadSmartFolders().filter(i => i.id !== result.data)
    saveSmartFolders(items)
    log.debug(`[smartFolders:delete] id=${result.data}`)
    return items
  })
}
