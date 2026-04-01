import { ipcMain, app } from 'electron'
import path from 'path'
import { z } from 'zod'
import log from './logger'
import { readJsonSync, updateJson } from './jsonStore'

interface TagStore {
  [filePath: string]: string[]
}

const FilePathSchema = z.string().min(1).max(4096)
const TagsSchema     = z.array(z.string().min(1).max(100)).max(50)
const TagSchema      = z.string().min(1).max(100)

function getTagStorePath(): string {
  return path.join(app.getPath('userData'), 'tags.json')
}

export function registerTagHandlers(): void {
  ipcMain.handle('tags:get', (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return []
    return readJsonSync<TagStore>(getTagStorePath(), {})[result.data] ?? []
  })

  ipcMain.handle('tags:set', async (_, rawPath: unknown, rawTags: unknown) => {
    const pathResult = FilePathSchema.safeParse(rawPath)
    const tagsResult = TagsSchema.safeParse(rawTags)
    if (!pathResult.success || !tagsResult.success) {
      log.warn('[tags:set] 유효하지 않은 입력')
      return { success: false, error: '유효하지 않은 입력' }
    }
    try {
      await updateJson<TagStore>(getTagStorePath(), {}, (store) => {
        if (tagsResult.data.length === 0) {
          delete store[pathResult.data]
        } else {
          store[pathResult.data] = tagsResult.data
        }
        return store
      })
      return { success: true }
    } catch (err) {
      log.error('[tags:set] 저장 실패', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tags:getAll', () => readJsonSync<TagStore>(getTagStorePath(), {}))

  ipcMain.handle('tags:getAllTags', () => {
    const store = readJsonSync<TagStore>(getTagStorePath(), {})
    const allTags = new Set<string>()
    for (const tags of Object.values(store)) {
      for (const tag of tags) allTags.add(tag)
    }
    return Array.from(allTags)
  })

  ipcMain.handle('tags:findByTag', (_, rawTag: unknown) => {
    const result = TagSchema.safeParse(rawTag)
    if (!result.success) return []
    const store = readJsonSync<TagStore>(getTagStorePath(), {})
    return Object.entries(store)
      .filter(([, tags]) => tags.includes(result.data))
      .map(([filePath]) => filePath)
  })
}
