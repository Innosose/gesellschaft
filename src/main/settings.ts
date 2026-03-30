import { ipcMain, app, globalShortcut } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  DEFAULT_SHORTCUT,
  DEFAULT_THEME_COLOR,
  DEFAULT_HUB_SIZE,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_SPIRAL_SCALE,
  DEFAULT_ANIM_SPEED,
} from '../shared/constants'

const SETTINGS_PATH = (): string => path.join(app.getPath('userData'), 'settings.json')

interface AppSettings {
  shortcut: string
  themeColor: string
  hubSize: number        // 80–160, default 114
  overlayOpacity: number // 0.70–0.97, default 0.88
  spiralScale: number    // 0.70–1.50, default 1.0
  animSpeed: 'slow' | 'normal' | 'fast'
}

const DEFAULTS: AppSettings = {
  shortcut:       DEFAULT_SHORTCUT,
  themeColor:     DEFAULT_THEME_COLOR,
  hubSize:        DEFAULT_HUB_SIZE,
  overlayOpacity: DEFAULT_OVERLAY_OPACITY,
  spiralScale:    DEFAULT_SPIRAL_SCALE,
  animSpeed:      DEFAULT_ANIM_SPEED,
}

function load(): AppSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH(), 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(s: AppSettings): void {
  fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(s, null, 2), 'utf8')
}

let currentShortcut = DEFAULT_SHORTCUT
let toggleFn: (() => void) | null = null

export function initShortcut(fn: () => void): string {
  toggleFn = fn
  const cfg = load()
  currentShortcut = cfg.shortcut
  const ok = globalShortcut.register(currentShortcut, toggleFn)
  if (!ok) {
    currentShortcut = DEFAULT_SHORTCUT
    globalShortcut.register(currentShortcut, toggleFn)
    save({ ...load(), shortcut: currentShortcut })
  }
  return currentShortcut
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getShortcut', () => currentShortcut)

  ipcMain.handle('settings:setShortcut', (_: Electron.IpcMainInvokeEvent, newShortcut: string) => {
    if (!newShortcut || !toggleFn) return { success: false, error: '잘못된 단축키' }
    const prev = currentShortcut
    globalShortcut.unregister(prev)
    const ok = globalShortcut.register(newShortcut, toggleFn)
    if (!ok) {
      globalShortcut.register(prev, toggleFn)  // restore old on failure
      return { success: false, error: '이미 사용 중인 단축키입니다.' }
    }
    currentShortcut = newShortcut
    save({ ...load(), shortcut: currentShortcut })
    return { success: true, shortcut: currentShortcut }
  })

  ipcMain.handle('settings:getTheme', () => load().themeColor)

  ipcMain.handle('settings:setTheme', (_: Electron.IpcMainInvokeEvent, color: string) => {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return { success: false, error: '유효하지 않은 색상값' }
    }
    save({ ...load(), themeColor: color })
    return { success: true }
  })

  ipcMain.handle('settings:getDisplay', () => {
    const { hubSize, overlayOpacity, spiralScale, animSpeed } = load()
    return { hubSize, overlayOpacity, spiralScale, animSpeed }
  })

  ipcMain.handle('settings:setDisplay', (_: Electron.IpcMainInvokeEvent, patch: Partial<AppSettings>) => {
    const current = load()
    const next: AppSettings = { ...current }
    if (patch.hubSize !== undefined) next.hubSize = Math.max(80, Math.min(160, Number(patch.hubSize) || current.hubSize))
    if (patch.overlayOpacity !== undefined) next.overlayOpacity = Math.max(0.70, Math.min(0.97, Number(patch.overlayOpacity) || current.overlayOpacity))
    if (patch.spiralScale !== undefined) next.spiralScale = Math.max(0.70, Math.min(1.50, Number(patch.spiralScale) || current.spiralScale))
    if (patch.animSpeed !== undefined && ['slow', 'normal', 'fast'].includes(patch.animSpeed as string)) next.animSpeed = patch.animSpeed as AppSettings['animSpeed']
    save(next)
    return { success: true }
  })
}
