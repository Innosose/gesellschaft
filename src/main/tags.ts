import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import log from './logger'

interface TagStore {
  [filePath: string]: string[]
}

const FilePathSchema = z.string().min(1).max(4096)
const TagsSchema     = z.array(z.string().min(1).max(100)).max(50)
const TagSchema      = z.string().min(1).max(100)

function getTagStorePath(): string {
  return path.join(app.getPath('userData'), 'tags.json')
}

function loadTags(): TagStore {
  try {
    const data = fs.readFileSync(getTagStorePath(), 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('[tags] 파일 로드 실패', err)
    }
    return {}
  }
}

function saveTags(store: TagStore): void {
  try {
    fs.writeFileSync(getTagStorePath(), JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    log.error('[tags] 파일 저장 실패', err)
  }
}

export function registerTagHandlers(): void {
  ipcMain.handle('tags:get', async (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return []
    return loadTags()[result.data] ?? []
  })

  ipcMain.handle('tags:set', async (_, rawPath: unknown, rawTags: unknown) => {
    const pathResult = FilePathSchema.safeParse(rawPath)
    const tagsResult = TagsSchema.safeParse(rawTags)
    if (!pathResult.success || !tagsResult.success) {
      log.warn('[tags:set] 유효하지 않은 입력')
      return { success: false, error: '유효하지 않은 입력' }
    }
    const store = loadTags()
    if (tagsResult.data.length === 0) {
      delete store[pathResult.data]
    } else {
      store[pathResult.data] = tagsResult.data
    }
    saveTags(store)
    return { success: true }
  })

  ipcMain.handle('tags:getAll', async () => loadTags())

  ipcMain.handle('tags:getAllTags', async () => {
    const store = loadTags()
    const allTags = new Set<string>()
    for (const tags of Object.values(store)) {
      for (const tag of tags) allTags.add(tag)
    }
    return Array.from(allTags)
  })

  ipcMain.handle('tags:findByTag', async (_, rawTag: unknown) => {
    const result = TagSchema.safeParse(rawTag)
    if (!result.success) return []
    const store = loadTags()
    return Object.entries(store)
      .filter(([, tags]) => tags.includes(result.data))
      .map(([filePath]) => filePath)
  })
}
