import { app, shell, BrowserWindow, ipcMain, dialog, screen, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log, { logIpcError } from './logger'

// ── IPC 핸들러 모듈 ─────────────────────────────
import { registerFileSystemHandlers } from './fileSystem'
import { registerSearchHandlers } from './search'
import { registerCadConvertHandlers } from './cadConvert'
import { registerTagHandlers } from './tags'
import { registerAutoOrganizeHandlers } from './autoOrganize'
import { registerNotesHandlers } from './notes'
import { registerSmartFoldersHandlers } from './smartFolders'
import { registerFolderCompareHandlers } from './folderCompare'
import { registerRemindersHandlers } from './reminders'
import { registerClipboardHandlers } from './clipboard'
import { registerTodoHandlers } from './todo'
import { registerQuickNotesHandlers } from './quickNotes'
import { registerPdfToolHandlers } from './pdfTool'
import { registerImageToolHandlers } from './imageTool'
import { registerExcelToolHandlers } from './excelTool'
import { registerAiAssistantHandlers } from './aiAssistant'
import { registerScreenCaptureHandlers } from './screenCapture'
import { initShortcut, registerSettingsHandlers } from './settings'
import { registerSnippetsHandlers } from './snippets'
import { registerEmailTemplatesHandlers } from './emailTemplates'
import { registerPomodoroHandlers } from './pomodoro'

// ── 전역 에러 핸들러 ────────────────────────────
process.on('uncaughtException', (err) => logIpcError('uncaughtException', err))

// ── 메인 윈도우 ─────────────────────────────────

function createWindow(): void {
  const { width, height, x, y } = screen.getPrimaryDisplay().bounds

  const mainWindow = new BrowserWindow({
    width, height, x, y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    resizable: false,
    movable: false,
    skipTaskbar: false,
    ...(process.platform === 'linux' ? {
      icon: join(__dirname, '../../resources/icon_256.png'),
      type: 'splash',
    } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // CSP — production only (dev needs vite HMR)
  if (!is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [[
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://api.openai.com https://api.anthropic.com https://fonts.googleapis.com https://fonts.gstatic.com",
            "worker-src blob:",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; ')],
        },
      })
    })
  }

  mainWindow.on('ready-to-show', () => { mainWindow.show(); mainWindow.focus() })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const { protocol } = new URL(details.url)
      if (protocol === 'https:' || protocol === 'http:') shell.openExternal(details.url)
    } catch { /* invalid URL */ }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // ── Window control IPC ──────────────────────
  ipcMain.on('window:hide', () => mainWindow.hide())
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:close', () => mainWindow.close())
  ipcMain.on('window:setIgnoreMouseEvents', (_e, ignore: boolean, options?: { forward: boolean }) => {
    mainWindow.setIgnoreMouseEvents(ignore, options ?? {})
  })

  ipcMain.handle('app:getLoginItem', () => {
    try { return app.getLoginItemSettings().openAtLogin }
    catch (err) { logIpcError('app:getLoginItem', err); return false }
  })

  ipcMain.handle('app:setLoginItem', (_, enable: boolean) => {
    try {
      app.setLoginItemSettings({ openAtLogin: enable, name: '게젤샤프트' })
      return { success: true }
    } catch (err) {
      logIpcError('app:setLoginItem', err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
      return result.canceled ? null : result.filePaths[0]
    } catch (err) { logIpcError('dialog:openDirectory', err); return null }
  })

  registerScreenCaptureHandlers(mainWindow)

  initShortcut(() => {
    if (mainWindow.isVisible()) mainWindow.hide()
    else { mainWindow.show(); mainWindow.focus() }
  })
}

// ── App lifecycle ───────────────────────────────

const allHandlers = [
  registerFileSystemHandlers, registerSearchHandlers, registerCadConvertHandlers,
  registerTagHandlers, registerAutoOrganizeHandlers, registerNotesHandlers,
  registerSmartFoldersHandlers, registerFolderCompareHandlers, registerRemindersHandlers,
  registerClipboardHandlers, registerTodoHandlers, registerQuickNotesHandlers,
  registerPdfToolHandlers, registerImageToolHandlers, registerExcelToolHandlers,
  registerAiAssistantHandlers, registerSettingsHandlers, registerSnippetsHandlers,
  registerEmailTemplatesHandlers, registerPomodoroHandlers,
]

app.whenReady().then(() => {
  log.info(`게젤샤프트 시작 — v${app.getVersion()} / Electron ${process.versions.electron} / Node ${process.versions.node}`)
  electronApp.setAppUserModelId('com.gesellschaft.app')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  allHandlers.forEach(register => register())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  log.info('모든 창 닫힘 — 앱 종료')
  if (process.platform !== 'darwin') app.quit()
})
