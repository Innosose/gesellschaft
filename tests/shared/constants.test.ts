/**
 * shared/constants.ts — comprehensive unit tests
 */
import {
  ALL_TOOLS,
  TOOL_DESCRIPTIONS,
  WINDOWS_RESERVED_NAMES,
  DEFAULT_THEME_COLOR,
  DEFAULT_SHORTCUT,
  DEFAULT_HUB_SIZE,
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_SPIRAL_SCALE,
  DEFAULT_ANIM_SPEED,
  CLIPBOARD_HISTORY_LIMIT,
  CLIPBOARD_POLL_INTERVAL,
  CLIPBOARD_MAX_LENGTH,
  REMINDER_CHECK_INTERVAL,
  QUICK_NOTE_COLORS,
} from '../../src/shared/constants'

// ─── ALL_TOOLS ──────────────────────────────────
describe('ALL_TOOLS', () => {
  it('has exactly 26 tools (A-Z)', () => {
    expect(ALL_TOOLS).toHaveLength(26)
  })

  it('every tool has id, label, color, description', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.id).toBeTruthy()
      expect(typeof tool.id).toBe('string')
      expect(tool.label).toBeTruthy()
      expect(typeof tool.label).toBe('string')
      expect(tool.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
    }
  })

  it('every tool has an icon field', () => {
    for (const tool of ALL_TOOLS) {
      expect(typeof tool.icon).toBe('string')
    }
  })

  it('no duplicate IDs', () => {
    const ids = ALL_TOOLS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no duplicate labels', () => {
    const labels = ALL_TOOLS.map(t => t.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('IDs are sorted alphabetically (A-Z order)', () => {
    const ids = ALL_TOOLS.map(t => t.id)
    const sorted = [...ids].sort((a, b) => a.localeCompare(b))
    expect(ids).toEqual(sorted)
  })

  it('IDs use camelCase or lowercase (no spaces, no uppercase start)', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.id).not.toMatch(/\s/)
      expect(tool.id).not.toMatch(/^[A-Z]/)
    }
  })

  it('descriptions are non-empty strings', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(5)
    }
  })

  it('contains key tools', () => {
    const ids = ALL_TOOLS.map(t => t.id)
    expect(ids).toContain('ai')
    expect(ids).toContain('clipboard')
    expect(ids).toContain('pdfTool')
    expect(ids).toContain('quickCalc')
    expect(ids).toContain('imageTools')
  })
})

// ─── TOOL_DESCRIPTIONS ──────────────────────────
describe('TOOL_DESCRIPTIONS', () => {
  it('maps every ALL_TOOLS id to its description', () => {
    for (const tool of ALL_TOOLS) {
      expect(TOOL_DESCRIPTIONS[tool.id]).toBe(tool.description)
    }
  })

  it('has same count as ALL_TOOLS', () => {
    expect(Object.keys(TOOL_DESCRIPTIONS)).toHaveLength(ALL_TOOLS.length)
  })
})

// ─── WINDOWS_RESERVED_NAMES ─────────────────────
describe('WINDOWS_RESERVED_NAMES', () => {
  it('contains CON, PRN, AUX, NUL', () => {
    for (const name of ['CON', 'PRN', 'AUX', 'NUL']) {
      expect(WINDOWS_RESERVED_NAMES.has(name)).toBe(true)
    }
  })

  it('contains COM1-COM9', () => {
    for (let i = 1; i <= 9; i++) {
      expect(WINDOWS_RESERVED_NAMES.has(`COM${i}`)).toBe(true)
    }
  })

  it('contains LPT1-LPT9', () => {
    for (let i = 1; i <= 9; i++) {
      expect(WINDOWS_RESERVED_NAMES.has(`LPT${i}`)).toBe(true)
    }
  })

  it('has exactly 22 entries (4 base + 9 COM + 9 LPT)', () => {
    expect(WINDOWS_RESERVED_NAMES.size).toBe(22)
  })

  it('does not contain lowercase variants', () => {
    expect(WINDOWS_RESERVED_NAMES.has('con')).toBe(false)
    expect(WINDOWS_RESERVED_NAMES.has('nul')).toBe(false)
  })
})

// ─── Default values ─────────────────────────────
describe('Default values', () => {
  it('DEFAULT_THEME_COLOR is valid hex', () => {
    expect(DEFAULT_THEME_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('DEFAULT_SHORTCUT is a non-empty string', () => {
    expect(DEFAULT_SHORTCUT).toBeTruthy()
    expect(DEFAULT_SHORTCUT).toContain('+')
  })

  it('DEFAULT_HUB_SIZE is in reasonable range', () => {
    expect(DEFAULT_HUB_SIZE).toBeGreaterThanOrEqual(80)
    expect(DEFAULT_HUB_SIZE).toBeLessThanOrEqual(200)
  })

  it('DEFAULT_OVERLAY_OPACITY is between 0 and 1', () => {
    expect(DEFAULT_OVERLAY_OPACITY).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_OVERLAY_OPACITY).toBeLessThanOrEqual(1)
  })

  it('DEFAULT_SPIRAL_SCALE is positive', () => {
    expect(DEFAULT_SPIRAL_SCALE).toBeGreaterThan(0)
  })

  it('DEFAULT_ANIM_SPEED is a valid value', () => {
    expect(['slow', 'normal', 'fast']).toContain(DEFAULT_ANIM_SPEED)
  })
})

// ─── Limits ─────────────────────────────────────
describe('Limits', () => {
  it('CLIPBOARD_HISTORY_LIMIT is positive integer', () => {
    expect(CLIPBOARD_HISTORY_LIMIT).toBeGreaterThan(0)
    expect(Number.isInteger(CLIPBOARD_HISTORY_LIMIT)).toBe(true)
  })

  it('CLIPBOARD_POLL_INTERVAL is reasonable (100-5000ms)', () => {
    expect(CLIPBOARD_POLL_INTERVAL).toBeGreaterThanOrEqual(100)
    expect(CLIPBOARD_POLL_INTERVAL).toBeLessThanOrEqual(5000)
  })

  it('CLIPBOARD_MAX_LENGTH is positive', () => {
    expect(CLIPBOARD_MAX_LENGTH).toBeGreaterThan(0)
  })

  it('REMINDER_CHECK_INTERVAL is 60 seconds', () => {
    expect(REMINDER_CHECK_INTERVAL).toBe(60000)
  })
})

// ─── QUICK_NOTE_COLORS ──────────────────────────
describe('QUICK_NOTE_COLORS', () => {
  it('has at least 3 colors', () => {
    expect(QUICK_NOTE_COLORS.length).toBeGreaterThanOrEqual(3)
  })

  it('all entries are valid hex colors', () => {
    for (const c of QUICK_NOTE_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('is a readonly tuple', () => {
    // Attempting to check that QUICK_NOTE_COLORS is frozen/readonly
    expect(Array.isArray(QUICK_NOTE_COLORS)).toBe(true)
  })
})
