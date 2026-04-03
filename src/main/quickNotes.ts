import { app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import { QUICK_NOTE_COLORS } from '../shared/constants'
import { createCrudStore, generateId } from './createCrudStore'

interface QuickNote {
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

let noteCount = 0

const store = createCrudStore<QuickNote>({
  channel: 'quickNotes',
  getPath: () => join(app.getPath('userData'), 'quick-notes.json'),
  saveSchema: QuickNoteSaveSchema,
  createItem: (data) => {
    const colorIdx = noteCount++ % QUICK_NOTE_COLORS.length
    return {
      id:        generateId('note'),
      title:     (data.title as string) ?? '',
      content:   (data.content as string) ?? '',
      color:     (data.color as string) ?? QUICK_NOTE_COLORS[colorIdx],
      updatedAt: Date.now(),
    }
  },
  updateItem: (existing, data) => ({
    ...existing,
    ...data,
    updatedAt: Date.now(),
  }),
})

export function registerQuickNotesHandlers(): void {
  store.register()
  noteCount = store.getItems().length
}
