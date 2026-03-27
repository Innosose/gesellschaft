import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'

export interface QuickNote {
  id: string
  title: string
  content: string
  color: string
  updatedAt: number
}

const COLORS = ['#2d2d2d', '#1a3a2a', '#1a1a3a', '#3a1a1a', '#2a2a1a']
let notes: QuickNote[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'quick-notes.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      notes = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
    }
  } catch { notes = [] }
}

function save(): void {
  try { fs.writeFileSync(getPath(), JSON.stringify(notes), 'utf-8') } catch { /* ignore */ }
}

export function registerQuickNotesHandlers(): void {
  load()

  ipcMain.handle('quickNotes:get', () => notes)

  ipcMain.handle('quickNotes:save', (_, note: Partial<QuickNote> & { id?: string }) => {
    const idx = notes.findIndex(n => n.id === note.id)
    if (idx >= 0) {
      notes[idx] = { ...notes[idx], ...note, updatedAt: Date.now() }
    } else {
      const colorIdx = notes.length % COLORS.length
      notes.unshift({
        id: Date.now().toString(),
        title: note.title || '',
        content: note.content || '',
        color: note.color || COLORS[colorIdx],
        updatedAt: Date.now()
      })
    }
    save()
    return notes
  })

  ipcMain.handle('quickNotes:delete', (_, id: string) => {
    notes = notes.filter(n => n.id !== id)
    save()
    return notes
  })
}

export { COLORS }
