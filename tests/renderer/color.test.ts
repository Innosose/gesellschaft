/**
 * color.ts — rgba helper and THEMES registry tests
 */
import { rgba, THEMES } from '../../src/renderer/src/utils/color'

describe('rgba', () => {
  it('basic red conversion', () => {
    expect(rgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)')
  })

  it('basic green conversion', () => {
    expect(rgba('#00ff00', 0.5)).toBe('rgba(0, 255, 0, 0.5)')
  })

  it('basic blue conversion', () => {
    expect(rgba('#0000ff', 0)).toBe('rgba(0, 0, 255, 0)')
  })

  it('black with full opacity', () => {
    expect(rgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('white with zero opacity', () => {
    expect(rgba('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)')
  })

  it('arbitrary hex value', () => {
    expect(rgba('#1a2b3c', 0.75)).toBe('rgba(26, 43, 60, 0.75)')
  })

  it('uppercase hex', () => {
    expect(rgba('#AABBCC', 0.5)).toBe('rgba(170, 187, 204, 0.5)')
  })
})

describe('THEMES', () => {
  it('has 12 themes', () => {
    expect(THEMES).toHaveLength(12)
  })

  it('all themes have id, name, color', () => {
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy()
      expect(theme.name).toBeTruthy()
      expect(theme.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('all theme IDs are unique', () => {
    const ids = THEMES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all theme names are unique', () => {
    const names = THEMES.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('contains common theme IDs', () => {
    const ids = THEMES.map(t => t.id)
    expect(ids).toContain('purple')
    expect(ids).toContain('blue')
    expect(ids).toContain('rose')
    expect(ids).toContain('emerald')
  })
})
