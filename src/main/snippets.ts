import { app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import { createCrudStore, generateId } from './createCrudStore'

interface Snippet {
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

const store = createCrudStore<Snippet>({
  channel: 'snippets',
  getPath: () => join(app.getPath('userData'), 'snippets.json'),
  saveSchema: SnippetSaveSchema,
  createItem: (data) => ({
    id:        generateId('snip'),
    title:     (data.title as string) ?? '새 스니펫',
    content:   (data.content as string) ?? '',
    tags:      (data.tags as string[]) ?? [],
    createdAt: Date.now(),
  }),
})

export function registerSnippetsHandlers(): void {
  store.register()
}
