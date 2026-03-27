/**
 * appStore.ts — Zustand 스토어 단위 테스트
 */

// window.api mock
const mockSettings = {
  getTheme: jest.fn().mockResolvedValue('#8b5cf6'),
  getDisplay: jest.fn().mockResolvedValue({
    hubSize: 120,
    overlayOpacity: 0.9,
    spiralScale: 1.1,
    animSpeed: 'fast',
  }),
  setTheme: jest.fn().mockResolvedValue({ success: true }),
  setDisplay: jest.fn().mockResolvedValue({ success: true }),
}

Object.defineProperty(global, 'window', {
  value: { api: { settings: mockSettings } },
  writable: true,
})

// CSS variable mock
Object.defineProperty(document.documentElement, 'style', {
  value: { setProperty: jest.fn() },
  writable: true,
})

import { useAppStore } from '../../src/renderer/src/store/appStore'
import {
  DEFAULT_THEME_COLOR,
  DEFAULT_HUB_SIZE,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_SPIRAL_SCALE,
  DEFAULT_ANIM_SPEED,
} from '../../src/shared/constants'

describe('useAppStore', () => {
  beforeEach(() => {
    // 스토어 초기 상태로 리셋
    useAppStore.setState({
      hubColor: DEFAULT_THEME_COLOR,
      hubSize: DEFAULT_HUB_SIZE,
      overlayOpacity: DEFAULT_OVERLAY_OPACITY,
      spiralScale: DEFAULT_SPIRAL_SCALE,
      animSpeed: DEFAULT_ANIM_SPEED,
    })
    jest.clearAllMocks()
  })

  describe('초기 상태', () => {
    it('기본값으로 초기화되어야 함', () => {
      const state = useAppStore.getState()
      expect(state.hubColor).toBe(DEFAULT_THEME_COLOR)
      expect(state.hubSize).toBe(DEFAULT_HUB_SIZE)
      expect(state.overlayOpacity).toBe(DEFAULT_OVERLAY_OPACITY)
      expect(state.spiralScale).toBe(DEFAULT_SPIRAL_SCALE)
      expect(state.animSpeed).toBe(DEFAULT_ANIM_SPEED)
    })
  })

  describe('setHubColor', () => {
    it('hubColor를 업데이트하고 API를 호출해야 함', () => {
      const { setHubColor } = useAppStore.getState()
      setHubColor('#ff0000')

      expect(useAppStore.getState().hubColor).toBe('#ff0000')
      expect(mockSettings.setTheme).toHaveBeenCalledWith('#ff0000')
    })

    it('CSS variable을 업데이트해야 함', () => {
      const { setHubColor } = useAppStore.getState()
      setHubColor('#00ff00')

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--gs-accent', '#00ff00')
    })
  })

  describe('setDisplay', () => {
    it('부분 업데이트가 가능해야 함', () => {
      const { setDisplay } = useAppStore.getState()
      setDisplay({ hubSize: 140 })

      const state = useAppStore.getState()
      expect(state.hubSize).toBe(140)
      expect(state.overlayOpacity).toBe(DEFAULT_OVERLAY_OPACITY) // 변경되지 않아야 함
    })

    it('API setDisplay를 호출해야 함', () => {
      const { setDisplay } = useAppStore.getState()
      setDisplay({ spiralScale: 1.2, animSpeed: 'fast' })

      expect(mockSettings.setDisplay).toHaveBeenCalledWith({ spiralScale: 1.2, animSpeed: 'fast' })
    })
  })

  describe('loadFromAPI', () => {
    it('API에서 설정을 로드하고 상태를 업데이트해야 함', async () => {
      const { loadFromAPI } = useAppStore.getState()
      await loadFromAPI()

      const state = useAppStore.getState()
      expect(state.hubColor).toBe('#8b5cf6')
      expect(state.hubSize).toBe(120)
      expect(state.overlayOpacity).toBe(0.9)
      expect(state.spiralScale).toBe(1.1)
      expect(state.animSpeed).toBe('fast')
    })
  })
})
