import {
  ALL_TOOLS,
  TOOL_DESCRIPTIONS,
  WINDOWS_RESERVED_NAMES,
  DEFAULT_THEME_COLOR,
  DEFAULT_HUB_SIZE,
} from '../../src/shared/constants'

describe('shared/constants', () => {
  describe('ALL_TOOLS', () => {
    it('23개 도구가 정의되어 있어야 함', () => {
      expect(ALL_TOOLS.length).toBe(23)
    })

    it('모든 도구는 id, icon, label, color, description을 가져야 함', () => {
      for (const tool of ALL_TOOLS) {
        expect(tool.id).toBeTruthy()
        expect(tool.icon).toBeTruthy()
        expect(tool.label).toBeTruthy()
        expect(tool.color).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(tool.description).toBeTruthy()
      }
    })

    it('도구 id는 중복 없어야 함', () => {
      const ids = ALL_TOOLS.map(t => t.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })
  })

  describe('TOOL_DESCRIPTIONS', () => {
    it('ALL_TOOLS의 모든 id가 포함되어야 함', () => {
      for (const tool of ALL_TOOLS) {
        expect(TOOL_DESCRIPTIONS[tool.id]).toBe(tool.description)
      }
    })
  })

  describe('WINDOWS_RESERVED_NAMES', () => {
    it('CON, PRN, AUX, NUL이 포함되어야 함', () => {
      expect(WINDOWS_RESERVED_NAMES.has('CON')).toBe(true)
      expect(WINDOWS_RESERVED_NAMES.has('PRN')).toBe(true)
      expect(WINDOWS_RESERVED_NAMES.has('AUX')).toBe(true)
      expect(WINDOWS_RESERVED_NAMES.has('NUL')).toBe(true)
    })

    it('COM1~COM9, LPT1~LPT9가 포함되어야 함', () => {
      for (let i = 1; i <= 9; i++) {
        expect(WINDOWS_RESERVED_NAMES.has(`COM${i}`)).toBe(true)
        expect(WINDOWS_RESERVED_NAMES.has(`LPT${i}`)).toBe(true)
      }
    })
  })

  describe('기본값', () => {
    it('DEFAULT_THEME_COLOR는 유효한 hex 색상이어야 함', () => {
      expect(DEFAULT_THEME_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('DEFAULT_HUB_SIZE는 80~160 범위여야 함', () => {
      expect(DEFAULT_HUB_SIZE).toBeGreaterThanOrEqual(80)
      expect(DEFAULT_HUB_SIZE).toBeLessThanOrEqual(160)
    })
  })
})
