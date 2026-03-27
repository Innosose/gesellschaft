import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from './logger'
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

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  const mainWindow = new BrowserWindow({
    width,
    height,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    resizable: false,
    movable: false,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../resources/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(details.url)
      }
    } catch { /* invalid URL — deny */ }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Window control IPC
  ipcMain.on('window:hide', () => mainWindow.hide())
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:close', () => mainWindow.close())
  ipcMain.on('window:setIgnoreMouseEvents', (_e: Electron.IpcMainEvent, ignore: boolean, options?: { forward: boolean }) => {
    mainWindow.setIgnoreMouseEvents(ignore, options ?? {})
  })

  // Login item (Windows auto-start)
  ipcMain.handle('app:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:setLoginItem', (_: Electron.IpcMainInvokeEvent, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable, name: '게젤샤프트' })
    return { success: true }
  })

  // Dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Global shortcut — loaded from settings (default: Ctrl+Shift+G)
  initShortcut(() => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  log.info(`게젤샤프트 시작 — v${app.getVersion()} / Electron ${process.versions.electron} / Node ${process.versions.node}`)
  electronApp.setAppUserModelId('com.gesellschaft.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerFileSystemHandlers()
  registerSearchHandlers()
  registerCadConvertHandlers()
  registerTagHandlers()
  registerAutoOrganizeHandlers()
  registerNotesHandlers()
  registerSmartFoldersHandlers()
  registerFolderCompareHandlers()
  registerRemindersHandlers()
  registerClipboardHandlers()
  registerTodoHandlers()
  registerQuickNotesHandlers()
  registerPdfToolHandlers()
  registerImageToolHandlers()
  registerExcelToolHandlers()
  registerAiAssistantHandlers()
  registerScreenCaptureHandlers()
  registerSettingsHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  log.info('모든 창 닫힘 — 앱 종료')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
