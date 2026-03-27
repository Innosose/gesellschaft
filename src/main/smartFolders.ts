import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

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

function getSmartFoldersPath(): string {
  return path.join(app.getPath('userData'), 'smartFolders.json')
}

function loadSmartFolders(): SmartFolder[] {
  try {
    const data = fs.readFileSync(getSmartFoldersPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveSmartFolders(items: SmartFolder[]): void {
  fs.writeFileSync(getSmartFoldersPath(), JSON.stringify(items, null, 2))
}

export function registerSmartFoldersHandlers(): void {
  ipcMain.handle('smartFolders:get', () => loadSmartFolders())

  ipcMain.handle('smartFolders:save', (_, folder: SmartFolder) => {
    const items = loadSmartFolders()
    const idx = items.findIndex((i) => i.id === folder.id)
    if (idx >= 0) {
      items[idx] = folder
    } else {
      items.push(folder)
    }
    saveSmartFolders(items)
    return items
  })

  ipcMain.handle('smartFolders:delete', (_, id: string) => {
    const items = loadSmartFolders().filter((i) => i.id !== id)
    saveSmartFolders(items)
    return items
  })
}
