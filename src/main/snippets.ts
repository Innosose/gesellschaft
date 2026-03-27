import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { z } from 'zod'
import log from './logger'

export interface Snippet {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
}

const SnippetSaveSchema = z.object({
  id:      z.string().optional(),
  title:   z.string().max(200).optional(),
  content: z.string().max(100_000).optional(),
  tags:    z.array(z.string().max(50)).max(20).optional(),
})

const SnippetIdSchema = z.string().min(1)

let snippets: Snippet[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'snippets.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      const raw = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
      snippets = Array.isArray(raw) ? raw : []
      log.debug(`[snippets] ${snippets.length}개 로드`)
    }
  } catch (err) {
    log.warn('[snippets] 파일 로드 실패, 초기화', err)
    snippets = []
  }
}

function save(): void {
  try {
    fs.writeFileSync(getPath(), JSON.stringify(snippets), 'utf-8')
  } catch (err) {
    log.error('[snippets] 파일 저장 실패', err)
  }
}

export function registerSnippetsHandlers(): void {
  load()

  ipcMain.handle('snippets:get', () => snippets)

  ipcMain.handle('snippets:save', (_, raw: unknown) => {
    const result = SnippetSaveSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[snippets:save] 유효하지 않은 입력', result.error.flatten())
      return snippets
    }
    const data = result.data
    const idx = snippets.findIndex(s => s.id === data.id)
    if (idx >= 0) {
      snippets[idx] = { ...snippets[idx], ...data }
    } else {
      snippets.unshift({
        id:        `snip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title:     data.title   ?? '새 스니펫',
        content:   data.content ?? '',
        tags:      data.tags    ?? [],
        createdAt: Date.now(),
      })
    }
    save()
    return snippets
  })

  ipcMain.handle('snippets:delete', (_, raw: unknown) => {
    const result = SnippetIdSchema.safeParse(raw)
    if (!result.success) return snippets
    snippets = snippets.filter(s => s.id !== result.data)
    save()
    log.debug(`[snippets:delete] id=${result.data}`)
    return snippets
  })
}
