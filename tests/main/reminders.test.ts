/**
 * reminders.ts — Zod schema validation tests
 * Tests the schemas used for reminder data validation
 */
import { z } from 'zod'

// Replicate the schemas from reminders.ts
const ReminderAddSchema = z.object({
  filePath: z.string(),
  fileName: z.string().min(1).max(260),
  note:     z.string().max(500),
  remindAt: z.number().int().positive(),
})

const ReminderIdSchema = z.string().min(1)

describe('ReminderAddSchema', () => {
  it('accepts valid reminder data', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/Users/test/report.pdf',
      fileName: 'report.pdf',
      note: 'Review this document',
      remindAt: Date.now() + 60000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty note', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'file.txt',
      note: '',
      remindAt: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty filePath', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '',
      fileName: 'file.txt',
      note: 'note',
      remindAt: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty fileName', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: '',
      note: 'note',
      remindAt: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects fileName over 260 chars', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'a'.repeat(261),
      note: 'note',
      remindAt: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects note over 500 chars', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'file.txt',
      note: 'a'.repeat(501),
      remindAt: 1000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative remindAt', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'file.txt',
      note: '',
      remindAt: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero remindAt', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'file.txt',
      note: '',
      remindAt: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects float remindAt', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: '/path',
      fileName: 'file.txt',
      note: '',
      remindAt: 1000.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(ReminderAddSchema.safeParse({}).success).toBe(false)
    expect(ReminderAddSchema.safeParse({ filePath: '/p' }).success).toBe(false)
  })

  it('rejects wrong types', () => {
    const result = ReminderAddSchema.safeParse({
      filePath: 123,
      fileName: 'file.txt',
      note: '',
      remindAt: 1000,
    })
    expect(result.success).toBe(false)
  })
})

describe('ReminderIdSchema', () => {
  it('accepts non-empty string', () => {
    expect(ReminderIdSchema.safeParse('abc-123').success).toBe(true)
  })

  it('rejects empty string', () => {
    expect(ReminderIdSchema.safeParse('').success).toBe(false)
  })

  it('rejects non-string', () => {
    expect(ReminderIdSchema.safeParse(123).success).toBe(false)
    expect(ReminderIdSchema.safeParse(null).success).toBe(false)
  })
})
