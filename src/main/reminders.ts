import { ipcMain, app, Notification, shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import log from './logger'
import { REMINDER_CHECK_INTERVAL } from '../shared/constants'

export interface Reminder {
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

const ReminderIdSchema = z.string().min(1)

function getRemindersPath(): string {
  return path.join(app.getPath('userData'), 'reminders.json')
}

function loadReminders(): Reminder[] {
  try {
    const data = fs.readFileSync(getRemindersPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('[reminders] 파일 로드 실패', err)
    }
    return []
  }
}

function saveReminders(items: Reminder[]): void {
  try {
    fs.writeFileSync(getRemindersPath(), JSON.stringify(items, null, 2))
  } catch (err) {
    log.error('[reminders] 파일 저장 실패', err)
  }
}

function checkAndNotify(): void {
  const reminders = loadReminders()
  const now = Date.now()
  let changed = false
  // 앱 재시작 후 1분 이내의 과거 알림만 표시, 너무 오래된 건 조용히 완료 처리
  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24시간

  for (const r of reminders) {
    if (!r.done && r.remindAt <= now) {
      r.done = true
      changed = true

      const age = now - r.remindAt
      if (age > STALE_THRESHOLD_MS) {
        log.info(`[reminders] 24시간 이상 경과한 알림 자동 완료: "${r.fileName}"`)
        continue
      }

      if (Notification.isSupported()) {
        const notif = new Notification({
          title: '파일 리마인더',
          body: `${r.fileName}${r.note ? `\n${r.note}` : ''}`
        })
        notif.on('click', () => {
          if (r.filePath) shell.showItemInFolder(r.filePath)
          BrowserWindow.getAllWindows()[0]?.focus()
        })
        notif.show()
        log.info(`[reminders] 알림 표시: "${r.fileName}"`)
      }
    }
  }

  if (changed) saveReminders(reminders)
}

let registered = false

export function registerRemindersHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('reminders:get', () => loadReminders())

  ipcMain.handle('reminders:add', (_, raw: unknown) => {
    const result = ReminderAddSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[reminders:add] 유효하지 않은 입력', result.error.flatten())
      return { success: false, error: '유효하지 않은 리마인더 데이터' }
    }
    const items = loadReminders()
    items.push({ ...result.data, id: `r-${Date.now()}`, done: false })
    saveReminders(items)
    log.debug(`[reminders:add] 추가: "${result.data.fileName}"`)
    return items
  })

  ipcMain.handle('reminders:delete', (_, raw: unknown) => {
    const result = ReminderIdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const items = loadReminders().filter(r => r.id !== result.data)
    saveReminders(items)
    log.debug(`[reminders:delete] id=${result.data}`)
    return items
  })

  ipcMain.handle('reminders:markDone', (_, raw: unknown) => {
    const result = ReminderIdSchema.safeParse(raw)
    if (!result.success) return { success: false, error: '유효하지 않은 id' }
    const items = loadReminders().map(r => r.id === result.data ? { ...r, done: true } : r)
    saveReminders(items)
    log.debug(`[reminders:markDone] id=${result.data}`)
    return items
  })

  // 앱 시작 시 즉시 확인 후 주기적 반복
  checkAndNotify()
  const timer = setInterval(checkAndNotify, REMINDER_CHECK_INTERVAL)
  app.on('before-quit', () => clearInterval(timer))
}
