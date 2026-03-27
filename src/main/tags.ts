import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

interface TagStore {
  [filePath: string]: string[]
}

function getTagStorePath(): string {
  return path.join(app.getPath('userData'), 'tags.json')
}

function loadTags(): TagStore {
  try {
    const data = fs.readFileSync(getTagStorePath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

function saveTags(store: TagStore): void {
  fs.writeFileSync(getTagStorePath(), JSON.stringify(store, null, 2), 'utf-8')
}

export function registerTagHandlers(): void {
  ipcMain.handle('tags:get', async (_, filePath: string) => {
    const store = loadTags()
    return store[filePath] || []
  })

  ipcMain.handle('tags:set', async (_, filePath: string, tags: string[]) => {
    const store = loadTags()
    if (tags.length === 0) {
      delete store[filePath]
    } else {
      store[filePath] = tags
    }
    saveTags(store)
    return { success: true }
  })

  ipcMain.handle('tags:getAll', async () => {
    return loadTags()
  })

  ipcMain.handle('tags:getAllTags', async () => {
    const store = loadTags()
    const allTags = new Set<string>()
    for (const tags of Object.values(store)) {
      for (const tag of tags) allTags.add(tag)
    }
    return Array.from(allTags)
  })

  ipcMain.handle('tags:findByTag', async (_, tag: string) => {
    const store = loadTags()
    return Object.entries(store)
      .filter(([, tags]) => tags.includes(tag))
      .map(([filePath]) => filePath)
  })
}
