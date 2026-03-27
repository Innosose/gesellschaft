import { ipcMain, clipboard, BrowserWindow, app } from 'electron'
import { join } from 'path'
import fs from 'fs'

let history: string[] = []
let lastText = ''
let registered = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function getPath(): string {
  return join(app.getPath('userData'), 'clipboard-history.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      history = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
    }
  } catch { history = [] }
}

function save(): void {
  try { fs.writeFileSync(getPath(), JSON.stringify(history), 'utf-8') } catch { /* ignore */ }
}

export function registerClipboardHandlers(): void {
  if (registered) return
  registered = true

  load()
  lastText = clipboard.readText()

  pollTimer = setInterval(() => {
    const text = clipboard.readText().trim()
    if (text && text !== lastText && text.length < 10000) {
      lastText = text
      history = history.filter(item => item !== text)
      history.unshift(text)
      if (history.length > 50) history = history.slice(0, 50)
      save()
      BrowserWindow.getAllWindows().forEach(w => {
        w.webContents.send('clipboard:updated', history)
      })
    }
  }, 1000)

  app.on('before-quit', () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })

  ipcMain.handle('clipboard:getHistory', () => history)

  ipcMain.handle('clipboard:copy', (_, text: string) => {
    clipboard.writeText(text)
    lastText = text
    return true
  })

  ipcMain.handle('clipboard:remove', (_, text: string) => {
    history = history.filter(item => item !== text)
    save()
    return history
  })

  ipcMain.handle('clipboard:clear', () => {
    history = []
    save()
    return history
  })
}
