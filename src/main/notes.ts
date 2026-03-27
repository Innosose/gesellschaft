import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

function getNotesPath(): string {
  return path.join(app.getPath('userData'), 'notes.json')
}

function loadNotes(): Record<string, string> {
  try {
    const data = fs.readFileSync(getNotesPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

function saveNotes(notes: Record<string, string>): void {
  fs.writeFileSync(getNotesPath(), JSON.stringify(notes, null, 2))
}

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:get', (_, filePath: string) => {
    return loadNotes()[filePath] || ''
  })

  ipcMain.handle('notes:set', (_, filePath: string, note: string) => {
    const notes = loadNotes()
    if (note.trim()) {
      notes[filePath] = note
    } else {
      delete notes[filePath]
    }
    saveNotes(notes)
    return { success: true }
  })
}
