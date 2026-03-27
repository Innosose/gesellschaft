import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { z } from 'zod'
import log from './logger'
import { QUICK_NOTE_COLORS } from '../shared/constants'

export interface QuickNote {
  id: string
  title: string
  content: string
  color: string
  updatedAt: number
}

const QuickNoteSaveSchema = z.object({
  id:      z.string().optional(),
  title:   z.string().max(200).optional(),
  content: z.string().max(50_000).optional(),
  color:   z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
})

const QuickNoteIdSchema = z.string().min(1)

let notes: QuickNote[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'quick-notes.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      const raw = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
      notes = Array.isArray(raw) ? raw : []
      log.debug(`[quickNotes] ${notes.length}개 로드`)
    }
  } catch (err) {
    log.warn('[quickNotes] 파일 로드 실패, 초기화', err)
    notes = []
  }
}

function save(): void {
  try {
    fs.writeFileSync(getPath(), JSON.stringify(notes), 'utf-8')
  } catch (err) {
    log.error('[quickNotes] 파일 저장 실패', err)
  }
}

export function registerQuickNotesHandlers(): void {
  load()

  ipcMain.handle('quickNotes:get', () => notes)

  ipcMain.handle('quickNotes:save', (_, raw: unknown) => {
    const result = QuickNoteSaveSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[quickNotes:save] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 메모 데이터' }
    }
    const note = result.data
    const idx = notes.findIndex(n => n.id === note.id)
    if (idx >= 0) {
      notes[idx] = { ...notes[idx], ...note, updatedAt: Date.now() }
    } else {
      const colorIdx = notes.length % QUICK_NOTE_COLORS.length
      notes.unshift({
        id:        Date.now().toString(),
        title:     note.title   ?? '',
        content:   note.content ?? '',
        color:     note.color   ?? QUICK_NOTE_COLORS[colorIdx],
        updatedAt: Date.now(),
      })
    }
    save()
    return notes
  })

  ipcMain.handle('quickNotes:delete', (_, raw: unknown) => {
    const result = QuickNoteIdSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[quickNotes:delete] 유효하지 않은 id')
      return { success: false, error: '유효하지 않은 id' }
    }
    notes = notes.filter(n => n.id !== result.data)
    save()
    log.debug(`[quickNotes:delete] id=${result.data}`)
    return notes
  })
}

export { QUICK_NOTE_COLORS }
