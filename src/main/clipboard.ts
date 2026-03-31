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
// history 배열과 항상 동기화 — O(1) 멤버십 확인 및 중복 제거 판단용
let historySet = new Set<string>()
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
      historySet = new Set(history)   // 시작 시 배열→Set 일괄 구성 O(n), 이후 O(1)
      log.debug(`[clipboard] ${history.length}개 로드`)
    }
  } catch (err) {
    log.warn('[clipboard] 파일 로드 실패, 초기화', err)
    history = []
    historySet.clear()
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

      if (historySet.has(text)) {
        // 기존 위치 제거 — 중복 재삽입 경우에만 O(n) 필터 실행
        history = history.filter(item => item !== text)
        // Set에서는 삭제하지 않아도 되지만 명시적으로 유지
      } else {
        // 신규 항목: 한도 초과 시 맨 끝 1개만 퇴출 (새 항목 추가로 최대 1개만 넘침)
        if (history.length >= CLIPBOARD_HISTORY_LIMIT) {
          historySet.delete(history[CLIPBOARD_HISTORY_LIMIT - 1])
          history = history.slice(0, CLIPBOARD_HISTORY_LIMIT - 1)
        }
      }

      history.unshift(text)
      historySet.add(text)        // 중복 삽입이어도 Set.add는 멱등

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
    if (historySet.delete(result.data)) {   // O(1) — 없으면 filter 자체를 건너뜀
      history = history.filter(item => item !== result.data)
      save()
    }
    return history
  })

  ipcMain.handle('clipboard:clear', () => {
    history = []
    historySet.clear()                      // O(1)
    save()
    log.debug('[clipboard:clear] 히스토리 초기화')
    return history
  })
}
