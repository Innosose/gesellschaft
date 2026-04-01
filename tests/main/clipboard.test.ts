/**
 * clipboard.ts — Zod schema and clipboard logic unit tests
 * Tests the ClipboardTextSchema and history deduplication logic
 */
import { z } from 'zod'
import { CLIPBOARD_HISTORY_LIMIT, CLIPBOARD_MAX_LENGTH } from '../../src/shared/constants'

// Replicate the schema from clipboard.ts
const ClipboardTextSchema = z.string().min(1).max(CLIPBOARD_MAX_LENGTH)

describe('ClipboardTextSchema', () => {
  it('accepts normal text', () => {
    expect(ClipboardTextSchema.safeParse('hello world').success).toBe(true)
  })

  it('accepts single character', () => {
    expect(ClipboardTextSchema.safeParse('a').success).toBe(true)
  })

  it('accepts text at max length', () => {
    const text = 'x'.repeat(CLIPBOARD_MAX_LENGTH)
    expect(ClipboardTextSchema.safeParse(text).success).toBe(true)
  })

  it('rejects empty string', () => {
    expect(ClipboardTextSchema.safeParse('').success).toBe(false)
  })

  it('rejects text exceeding max length', () => {
    const text = 'x'.repeat(CLIPBOARD_MAX_LENGTH + 1)
    expect(ClipboardTextSchema.safeParse(text).success).toBe(false)
  })

  it('rejects non-string types', () => {
    expect(ClipboardTextSchema.safeParse(123).success).toBe(false)
    expect(ClipboardTextSchema.safeParse(null).success).toBe(false)
    expect(ClipboardTextSchema.safeParse(undefined).success).toBe(false)
    expect(ClipboardTextSchema.safeParse({}).success).toBe(false)
  })

  it('accepts unicode text', () => {
    expect(ClipboardTextSchema.safeParse('한글 텍스트').success).toBe(true)
    expect(ClipboardTextSchema.safeParse('日本語テスト').success).toBe(true)
    expect(ClipboardTextSchema.safeParse('🎉🎊').success).toBe(true)
  })

  it('accepts multiline text', () => {
    expect(ClipboardTextSchema.safeParse('line1\nline2\nline3').success).toBe(true)
  })
})

// ─── History deduplication logic ────────────────
// Reimplemented from clipboard.ts for isolated testing
describe('Clipboard history deduplication', () => {
  function simulateHistory(initial: string[], newItem: string): string[] {
    let history = [...initial]
    const historySet = new Set(history)
    const text = newItem.trim()

    if (!text || text.length > CLIPBOARD_MAX_LENGTH) return history

    if (historySet.has(text)) {
      // Move to front (dedup)
      history = history.filter(item => item !== text)
    } else {
      // Enforce limit
      if (history.length >= CLIPBOARD_HISTORY_LIMIT) {
        history = history.slice(0, CLIPBOARD_HISTORY_LIMIT - 1)
      }
    }
    history.unshift(text)
    return history
  }

  it('adds new item to front', () => {
    const result = simulateHistory(['a', 'b'], 'c')
    expect(result).toEqual(['c', 'a', 'b'])
  })

  it('moves duplicate to front', () => {
    const result = simulateHistory(['a', 'b', 'c'], 'b')
    expect(result).toEqual(['b', 'a', 'c'])
  })

  it('enforces history limit', () => {
    const full = Array.from({ length: CLIPBOARD_HISTORY_LIMIT }, (_, i) => `item${i}`)
    const result = simulateHistory(full, 'new')
    expect(result).toHaveLength(CLIPBOARD_HISTORY_LIMIT)
    expect(result[0]).toBe('new')
  })

  it('does not add empty text', () => {
    const result = simulateHistory(['a'], '')
    expect(result).toEqual(['a'])
  })

  it('does not add text exceeding max length', () => {
    const longText = 'x'.repeat(CLIPBOARD_MAX_LENGTH + 1)
    const result = simulateHistory(['a'], longText)
    expect(result).toEqual(['a'])
  })

  it('handles empty history', () => {
    const result = simulateHistory([], 'first')
    expect(result).toEqual(['first'])
  })
})
