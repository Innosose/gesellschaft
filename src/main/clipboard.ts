import { ipcMain, clipboard, BrowserWindow, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { z } from 'zod'
import log, { logIpcError } from './logger'
import {
  CLIPBOARD_HISTORY_LIMIT,
  CLIPBOARD_POLL_INTERVAL,
  CLIPBOARD_MAX_LENGTH,
} from '../shared/constants'

let history: string[] = []
let lastText = ''
let registered = false
let pollTimer: ReturnType<typeof setInterval> | null = null

const ClipboardTextSchema = z.string().min(1).max(CLIPBOARD_MAX_LENGTH)

function getPath(): string {
  return join(app.getPath('userData'), 'clipboard-history.json')
}

function load(): void {
  try {
    if (fs.existsSync(getPath())) {
      const raw = JSON.parse(fs.readFileSync(getPath(), 'utf-8'))
      history = Array.isArray(raw) ? raw : []
      log.debug(`[clipboard] ${history.length}개 로드`)
    }
  } catch (err) {
    log.warn('[clipboard] 파일 로드 실패, 초기화', err)
    history = []
  }
}

function save(): void {
  try {
    fs.writeFileSync(getPath(), JSON.stringify(history), 'utf-8')
  } catch (err) {
    log.error('[clipboard] 파일 저장 실패', err)
  }
}

export function registerClipboardHandlers(): void {
  if (registered) return
  registered = true

  load()
  lastText = clipboard.readText()

  pollTimer = setInterval(() => {
    const text = clipboard.readText().trim()
    if (text && text !== lastText && text.length <= CLIPBOARD_MAX_LENGTH) {
      lastText = text
      history = history.filter(item => item !== text)
      history.unshift(text)
      if (history.length > CLIPBOARD_HISTORY_LIMIT) {
        history = history.slice(0, CLIPBOARD_HISTORY_LIMIT)
      }
      save()
      BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) w.webContents.send('clipboard:updated', history)
      })
    }
  }, CLIPBOARD_POLL_INTERVAL)

  app.on('before-quit', () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  })

  ipcMain.handle('clipboard:getHistory', () => history)

  ipcMain.handle('clipboard:copy', (_, raw: unknown) => {
    const result = ClipboardTextSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[clipboard:copy] 유효하지 않은 텍스트')
      return false
    }
    clipboard.writeText(result.data)
    lastText = result.data
    return true
  })

  ipcMain.handle('clipboard:remove', (_, raw: unknown) => {
    const result = ClipboardTextSchema.safeParse(raw)
    if (!result.success) {
      log.warn('[clipboard:remove] 유효하지 않은 텍스트')
      return history
    }
    history = history.filter(item => item !== result.data)
    save()
    return history
  })

  ipcMain.handle('clipboard:clear', () => {
    history = []
    save()
    log.debug('[clipboard:clear] 히스토리 초기화')
    return history
  })
}
