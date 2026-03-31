import { ipcMain, app } from 'electron'
import path from 'path'
import { z } from 'zod'
import log from './logger'
import { readJsonSync, updateJson } from './jsonStore'

const FilePathSchema = z.string().min(1).max(4096)
const NoteSchema     = z.string().max(100_000)

function getNotesPath(): string {
  return path.join(app.getPath('userData'), 'notes.json')
}

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:get', (_, rawPath: unknown) => {
    const result = FilePathSchema.safeParse(rawPath)
    if (!result.success) return ''
    return readJsonSync<Record<string, string>>(getNotesPath(), {})[result.data] ?? ''
  })

  ipcMain.handle('notes:set', async (_, rawPath: unknown, rawNote: unknown) => {
    const pathResult = FilePathSchema.safeParse(rawPath)
    const noteResult = NoteSchema.safeParse(rawNote)
    if (!pathResult.success || !noteResult.success) {
      log.warn('[notes:set] 유효하지 않은 입력')
      return { success: false, error: '유효하지 않은 입력' }
    }
    try {
      await updateJson<Record<string, string>>(getNotesPath(), {}, (notes) => {
        if (noteResult.data.trim()) {
          notes[pathResult.data] = noteResult.data
        } else {
          delete notes[pathResult.data]
        }
        return notes
      })
      return { success: true }
    } catch (err) {
      log.error('[notes:set] 저장 실패', err)
      return { success: false, error: String(err) }
    }
  })
}
