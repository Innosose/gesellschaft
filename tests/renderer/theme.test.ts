/**
 * Theme system unit tests
 * Tests THEME_PRESETS, rgba(), buildTokens via T, PARTICLE_CONFIGS
 */
import { THEME_PRESETS, PARTICLE_CONFIGS, T, setTheme, getThemeId, getCurrentTheme } from '../../src/renderer/src/utils/theme'
import { rgba } from '../../src/renderer/src/utils/color'
import type { ThemePreset, ParticleShape } from '../../src/renderer/src/utils/theme'

// ─── rgba helper ────────────────────────────────
describe('rgba', () => {
  it('converts #ff0000 with alpha 0.5', () => {
    expect(rgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('converts #000000 with alpha 1', () => {
    expect(rgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('converts #ffffff with alpha 0', () => {
    expect(rgba('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)')
  })

  it('handles mixed hex values', () => {
    expect(rgba('#1a2b3c', 0.8)).toBe('rgba(26, 43, 60, 0.8)')
  })

  it('handles uppercase hex', () => {
    expect(rgba('#FF00FF', 0.3)).toBe('rgba(255, 0, 255, 0.3)')
  })
})

// ─── THEME_PRESETS ──────────────────────────────
describe('THEME_PRESETS', () => {
  it('has exactly 8 presets', () => {
    expect(THEME_PRESETS).toHaveLength(8)
  })

  it('all presets have unique ids', () => {
    const ids = THEME_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all presets have unique names', () => {
    const names = THEME_PRESETS.map(p => p.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('all presets have required hex color fields', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/
    for (const p of THEME_PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.primary).toMatch(hexPattern)
      expect(p.accent).toMatch(hexPattern)
      expect(p.fg).toMatch(hexPattern)
      expect(p.danger).toMatch(hexPattern)
      expect(p.success).toMatch(hexPattern)
      expect(p.warning).toMatch(hexPattern)
      expect(p.bg).toMatch(hexPattern)
      expect(p.surface).toMatch(hexPattern)
    }
  })

  it('all presets have font strings', () => {
    for (const p of THEME_PRESETS) {
      expect(p.titleFont).toBeTruthy()
      expect(p.bodyFont).toBeTruthy()
      expect(typeof p.titleFont).toBe('string')
      expect(typeof p.bodyFont).toBe('string')
    }
  })

  it('all presets have valid shape config', () => {
    for (const p of THEME_PRESETS) {
      expect(p.shape).toBeDefined()
      expect(p.shape.borderRadius).toBeTruthy()
      expect(p.shape.hubBorderRadius).toBeTruthy()
      expect(typeof p.shape.aspectRatio).toBe('number')
      expect(p.shape.aspectRatio).toBeGreaterThan(0)
      expect(p.shape.aspectRatio).toBeLessThanOrEqual(1)
    }
  })

  it('all presets have valid animation settings', () => {
    for (const p of THEME_PRESETS) {
      expect(p.openAnim).toBeTruthy()
      expect(p.hubOpenAnim).toBeTruthy()
      expect(p.openDuration).toBeGreaterThan(0)
      expect(p.openEasing).toBeTruthy()
    }
  })

  it('all presets have valid particle settings', () => {
    const validShapes: ParticleShape[] = ['petal', 'ember', 'sparkle', 'snow', 'leaf', 'dust', 'bubble', 'ash']
    for (const p of THEME_PRESETS) {
      expect(validShapes).toContain(p.particle)
      expect(p.particleColor).toBeTruthy()
      expect(p.particleCount).toBeGreaterThan(0)
    }
  })

  it('all presets have valid blur and brightness', () => {
    for (const p of THEME_PRESETS) {
      expect(p.blurStrength).toBeGreaterThanOrEqual(16)
      expect(p.blurStrength).toBeLessThanOrEqual(48)
      expect(p.brightness).toBeGreaterThanOrEqual(0.3)
      expect(p.brightness).toBeLessThanOrEqual(0.8)
    }
  })

  it('known preset IDs exist', () => {
    const ids = THEME_PRESETS.map(p => p.id)
    expect(ids).toContain('ruina')
    expect(ids).toContain('crimson')
    expect(ids).toContain('violet')
    expect(ids).toContain('arctic')
    expect(ids).toContain('emerald')
    expect(ids).toContain('rose')
    expect(ids).toContain('mono')
    expect(ids).toContain('sunset')
  })
})

// ─── PARTICLE_CONFIGS ───────────────────────────
describe('PARTICLE_CONFIGS', () => {
  const shapes: ParticleShape[] = ['petal', 'ember', 'sparkle', 'snow', 'leaf', 'dust', 'bubble', 'ash']

  it('has config for every particle shape', () => {
    for (const shape of shapes) {
      expect(PARTICLE_CONFIGS[shape]).toBeDefined()
    }
  })

  it('all configs have valid dimension functions', () => {
    for (const shape of shapes) {
      const cfg = PARTICLE_CONFIGS[shape]
      expect(typeof cfg.width).toBe('function')
      expect(typeof cfg.height).toBe('function')
      expect(cfg.width(10)).toBeGreaterThan(0)
      expect(cfg.height(10)).toBeGreaterThan(0)
    }
  })

  it('all configs have borderRadius and animation', () => {
    for (const shape of shapes) {
      const cfg = PARTICLE_CONFIGS[shape]
      expect(cfg.borderRadius).toBeTruthy()
      expect(cfg.animation).toBeTruthy()
    }
  })
})

// ─── Token builder (via exported T) ─────────────
describe('Token builder (T)', () => {
  it('T has expected token fields', () => {
    expect(T.gold).toBeTruthy()
    expect(T.teal).toBeTruthy()
    expect(T.fg).toBeTruthy()
    expect(T.danger).toBeTruthy()
    expect(T.success).toBeTruthy()
    expect(T.warning).toBeTruthy()
    expect(T.bg).toBeTruthy()
    expect(T.surface).toBeTruthy()
  })

  it('T has pre-computed rgba text tokens', () => {
    expect(T.text).toMatch(/^rgba\(/)
    expect(T.textSub).toMatch(/^rgba\(/)
    expect(T.textMuted).toMatch(/^rgba\(/)
  })

  it('T has gold opacity variants', () => {
    expect(T.gold06).toMatch(/^rgba\(/)
    expect(T.gold10).toMatch(/^rgba\(/)
    expect(T.gold15).toMatch(/^rgba\(/)
    expect(T.gold20).toMatch(/^rgba\(/)
    expect(T.gold30).toMatch(/^rgba\(/)
    expect(T.gold50).toMatch(/^rgba\(/)
  })

  it('T has teal opacity variants', () => {
    expect(T.teal08).toMatch(/^rgba\(/)
    expect(T.teal15).toMatch(/^rgba\(/)
    expect(T.teal25).toMatch(/^rgba\(/)
    expect(T.teal30).toMatch(/^rgba\(/)
  })
})

// ─── setTheme / getThemeId ──────────────────────
describe('setTheme / getThemeId', () => {
  it('defaults to first preset (ruina)', () => {
    expect(getThemeId()).toBe('ruina')
  })

  it('switches theme when valid id is given', () => {
    setTheme('crimson')
    expect(getThemeId()).toBe('crimson')
    expect(getCurrentTheme().name).toBe('Crimson Night')
  })

  it('does nothing for invalid id', () => {
    setTheme('crimson')
    setTheme('nonexistent')
    expect(getThemeId()).toBe('crimson')
  })

  it('does nothing when setting same theme', () => {
    setTheme('arctic')
    const before = getCurrentTheme()
    setTheme('arctic')
    expect(getCurrentTheme()).toBe(before) // exact same reference
  })

  it('updates CSS variables on theme change', () => {
    setTheme('violet')
    const style = document.documentElement.style
    expect(style.getPropertyValue('--theme-primary')).toBeTruthy()
  })

  // Reset to default after tests
  afterAll(() => setTheme('ruina'))
})
