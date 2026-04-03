import { app } from 'electron'
import { join } from 'path'
import { z } from 'zod'
import { createCrudStore, generateId } from './createCrudStore'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  updatedAt: number
}

const TemplateSaveSchema = z.object({
  id:      z.string().optional(),
  name:    z.string().max(200).optional(),
  subject: z.string().max(500).optional(),
  body:    z.string().max(100_000).optional(),
})

const store = createCrudStore<EmailTemplate>({
  channel: 'emailTemplates',
  getPath: () => join(app.getPath('userData'), 'email-templates.json'),
  saveSchema: TemplateSaveSchema,
  createItem: (data) => ({
    id:        generateId('tpl'),
    name:      (data.name as string) ?? '새 템플릿',
    subject:   (data.subject as string) ?? '',
    body:      (data.body as string) ?? '',
    updatedAt: Date.now(),
  }),
  updateItem: (existing, data) => ({
    ...existing,
    ...data,
    updatedAt: Date.now(),
  }),
})

export function registerEmailTemplatesHandlers(): void {
  store.register()
}
