import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import log, { logIpcError } from './logger'

const FilePathSchema = z.string().min(1).max(4096)
const NoteSchema    = z.string().max(100_000)

function getNotesPath(): string {
  return path.join(app.getPath('userData'), 'notes.json')
}

function loadNotes(): Record<string, string> {
  try {
    const data = fs.readFileSync(getNotesPath(), 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('[notes] 파일 로드 실패', err)
    }
    return {}
  }
}

function saveNotes(notes: Record<string, string>): void {
  try {
    fs.writeFileSync(getNotesPath(), JSON.stringify(notes, null, 2))
  } catch (err) {
    log.error('[notes] 파일 저장 실패', err)
  }
}

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:get', (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return ''
    return loadNotes()[result.data] ?? ''
  })

  ipcMain.handle('notes:set', (_, rawPath: unknown, rawNote: unknown) => {
    const pathResult = FilePathSchema.safeParse(rawPath)
    const noteResult = NoteSchema.safeParse(rawNote)
    if (!pathResult.success || !noteResult.success) {
      log.warn('[notes:set] 유효하지 않은 입력')
      return { success: false, error: '유효하지 않은 입력' }
    }
    const notes = loadNotes()
    if (noteResult.data.trim()) {
      notes[pathResult.data] = noteResult.data
    } else {
      delete notes[pathResult.data]
    }
    saveNotes(notes)
    return { success: true }
  })
}
