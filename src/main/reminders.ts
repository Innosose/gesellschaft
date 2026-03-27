import { ipcMain, app, Notification, shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

export interface Reminder {
  id: string
  filePath: string
  fileName: string
  note: string
  remindAt: number
  done: boolean
}

function getRemindersPath(): string {
  return path.join(app.getPath('userData'), 'reminders.json')
}

function loadReminders(): Reminder[] {
  try {
    const data = fs.readFileSync(getRemindersPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveReminders(items: Reminder[]): void {
  fs.writeFileSync(getRemindersPath(), JSON.stringify(items, null, 2))
}

function checkAndNotify(): void {
  const reminders = loadReminders()
  const now = Date.now()
  let changed = false

  for (const r of reminders) {
    if (!r.done && r.remindAt <= now) {
      r.done = true
      changed = true

      if (Notification.isSupported()) {
        const notif = new Notification({
          title: '📄 파일 리마인더',
          body: `${r.fileName}${r.note ? `\n${r.note}` : ''}`
        })
        notif.on('click', () => {
          if (r.filePath) shell.showItemInFolder(r.filePath)
          BrowserWindow.getAllWindows()[0]?.focus()
        })
        notif.show()
      }
    }
  }

  if (changed) saveReminders(reminders)
}

export function registerRemindersHandlers(): void {
  ipcMain.handle('reminders:get', () => loadReminders())

  ipcMain.handle('reminders:add', (_, reminder: Omit<Reminder, 'id' | 'done'>) => {
    const items = loadReminders()
    items.push({ ...reminder, id: `r-${Date.now()}`, done: false })
    saveReminders(items)
    return items
  })

  ipcMain.handle('reminders:delete', (_, id: string) => {
    const items = loadReminders().filter((r) => r.id !== id)
    saveReminders(items)
    return items
  })

  ipcMain.handle('reminders:markDone', (_, id: string) => {
    const items = loadReminders().map((r) => (r.id === id ? { ...r, done: true } : r))
    saveReminders(items)
    return items
  })

  // 앱 시작 시 즉시 확인 후 1분마다 반복
  checkAndNotify()
  const timer = setInterval(checkAndNotify, 60 * 1000)
  app.on('before-quit', () => clearInterval(timer))
}
