import { ipcMain, app, Notification, shell, BrowserWindow } from 'electron'
import path from 'path'
import { z } from 'zod'
import log from './logger'
import { REMINDER_CHECK_INTERVAL } from '../shared/constants'
import { readJsonSync, writeJsonLocked } from './jsonStore'

interface Reminder {
  id: string
  filePath: string
  fileName: string
  note: string
  remindAt: number
  done: boolean
}

const ReminderAddSchema = z.object({
  filePath: z.string(),
  fileName: z.string().min(1).max(260),
  note:     z.string().max(500),
  remindAt: z.number().int().positive(),
})

const IdSchema = z.string().min(1)

const getPath = () => path.join(app.getPath('userData'), 'reminders.json')
const load  = () => readJsonSync<Reminder[]>(getPath(), [])
const save  = (items: Reminder[]) => writeJsonLocked(getPath(), items)

const STALE_MS = 24 * 60 * 60 * 1000

function checkAndNotify(): void {
  const reminders = load()
  const now = Date.now()
  let changed = false

  for (const r of reminders) {
    if (r.done || r.remindAt > now) continue
    r.done = true
    changed = true

    if (now - r.remindAt > STALE_MS) {
      log.info(`[reminders] 24시간 이상 경과한 알림 자동 완료: "${r.fileName}"`)
      continue
    }

    if (Notification.isSupported()) {
      const notif = new Notification({
        title: '파일 리마인더',
        body: `${r.fileName}${r.note ? `\n${r.note}` : ''}`,
      })
      notif.on('click', () => {
        if (r.filePath) shell.showItemInFolder(r.filePath)
        BrowserWindow.getAllWindows()[0]?.focus()
      })
      notif.show()
    }
  }

  if (changed) save(reminders)
}

export function registerRemindersHandlers(): void {
  ipcMain.handle('reminders:get', () => load())

  ipcMain.handle('reminders:add', async (_, raw: unknown) => {
    const result = ReminderAddSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[reminders:add] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 리마인더 데이터' }
    }
    const items = load()
    items.push({ ...result.data, id: `r-${Date.now()}`, done: false })
    await save(items)
    return items
  })

  ipcMain.handle('reminders:delete', async (_, raw: unknown) => {
    const result = IdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const items = load().filter(r => r.id !== result.data)
    await save(items)
    return items
  })

  ipcMain.handle('reminders:markDone', async (_, raw: unknown) => {
    const result = IdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const items = load().map(r => r.id === result.data ? { ...r, done: true } : r)
    await save(items)
    return items
  })

  checkAndNotify()
  const timer = setInterval(checkAndNotify, REMINDER_CHECK_INTERVAL)
  app.on('before-quit', () => clearInterval(timer))
}
