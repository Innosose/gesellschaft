import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { z } from 'zod'
import log from './logger'

export interface EmailTemplate {
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

const TemplateIdSchema = z.string().min(1)

let templates: EmailTemplate[] = []

function getPath(): string {
  return join(app.getPath('userData'), 'email-templates.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      const raw = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
      templates = Array.isArray(raw) ? raw : []
      log.debug(`[emailTemplates] ${templates.length}개 로드`)
    }
  } catch (err) {
    log.warn('[emailTemplates] 파일 로드 실패, 초기화', err)
    templates = []
  }
}

function save(): void {
  try {
    fs.writeFileSync(getPath(), JSON.stringify(templates), 'utf-8')
  } catch (err) {
    log.error('[emailTemplates] 파일 저장 실패', err)
  }
}

export function registerEmailTemplatesHandlers(): void {
  load()

  ipcMain.handle('emailTemplates:get', () => templates)

  ipcMain.handle('emailTemplates:save', (_, raw: unknown) => {
    const result = TemplateSaveSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[emailTemplates:save] 유효하지 않은 입력', result.error.flatten())
      return templates
    }
    const data = result.data
    const idx = templates.findIndex(t => t.id === data.id)
    if (idx >= 0) {
      templates[idx] = { ...templates[idx], ...data, updatedAt: Date.now() }
    } else {
      templates.unshift({
        id:        `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name:      data.name    ?? '새 템플릿',
        subject:   data.subject ?? '',
        body:      data.body    ?? '',
        updatedAt: Date.now(),
      })
    }
    save()
    return templates
  })

  ipcMain.handle('emailTemplates:delete', (_, raw: unknown) => {
    const result = TemplateIdSchema.safeParse(raw)
    if (!result.success) return templates
    templates = templates.filter(t => t.id !== result.data)
    save()
    log.debug(`[emailTemplates:delete] id=${result.data}`)
    return templates
  })
}
