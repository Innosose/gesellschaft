import { create } from 'zustand'
import {
  DEFAULT_THEME_COLOR,
  DEFAULT_HUB_SIZE,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_SPIRAL_SCALE,
  DEFAULT_ANIM_SPEED,
} from '../../../shared/constants'

export type AnimSpeed = 'slow' | 'normal' | 'fast'

export interface DisplaySettings {
  hubSize: number
  overlayOpacity: number
  spiralScale: number
  animSpeed: AnimSpeed
}

interface AppState extends DisplaySettings {
  hubColor: string
  // Actions
  setHubColor: (color: string) => void
  setDisplay: (patch: Partial<DisplaySettings>) => void
  loadFromAPI: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  // 초기값 (API 로드 전 기본값)
  hubColor:       DEFAULT_THEME_COLOR,
  hubSize:        DEFAULT_HUB_SIZE,
  overlayOpacity: DEFAULT_OVERLAY_OPACITY,
  spiralScale:    DEFAULT_SPIRAL_SCALE,
  animSpeed:      DEFAULT_ANIM_SPEED,

  setHubColor: (color: string) => {
    set({ hubColor: color })
    document.documentElement.style.setProperty('--gs-accent', color)
    window.api.settings.setTheme(color)
  },

  setDisplay: (patch: Partial<DisplaySettings>) => {
    set(patch)
    window.api.settings.setDisplay(patch as Record<string, unknown>)
  },

  loadFromAPI: async () => {
    const [color, display] = await Promise.all([
      window.api.settings.getTheme(),
      window.api.settings.getDisplay(),
    ])
    const next: Partial<AppState> = {}
    if (color) {
      next.hubColor = color
      document.documentElement.style.setProperty('--gs-accent', color)
    }
    if (display.hubSize)        next.hubSize = display.hubSize
    if (display.overlayOpacity) next.overlayOpacity = display.overlayOpacity
    if (display.spiralScale)    next.spiralScale = display.spiralScale
    if (display.animSpeed)      next.animSpeed = display.animSpeed as AnimSpeed
    set(next)
  },
}))
