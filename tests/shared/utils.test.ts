/**
 * shared/utils.ts — isValidFileName comprehensive tests
 */
import { isValidFileName } from '../../src/shared/utils'

describe('isValidFileName', () => {
  describe('valid file names', () => {
    const validNames = [
      'hello.txt',
      'report_2024.docx',
      'image-001.png',
      'Makefile',
      'README',
      '.gitignore',
      '.env.local',
      'file with spaces.txt',
      'data (1).csv',
      'résumé.pdf',
      '한글파일.txt',
      '日本語.doc',
      'name_with-mixed.chars123',
      'a',
      '1',
    ]
    for (const name of validNames) {
      it(`accepts "${name}"`, () => {
        expect(isValidFileName(name).valid).toBe(true)
      })
    }
  })

  describe('empty/whitespace rejection', () => {
    it('rejects empty string', () => {
      expect(isValidFileName('').valid).toBe(false)
    })

    it('rejects spaces only', () => {
      expect(isValidFileName('   ').valid).toBe(false)
    })

    it('rejects tabs only', () => {
      expect(isValidFileName('\t\t').valid).toBe(false)
    })
  })

  describe('path separator rejection', () => {
    it('rejects forward slash', () => {
      expect(isValidFileName('path/to/file').valid).toBe(false)
    })

    it('rejects backslash', () => {
      expect(isValidFileName('path\\file').valid).toBe(false)
    })

    it('rejects relative path with dots', () => {
      expect(isValidFileName('../secret.txt').valid).toBe(false)
    })
  })

  describe('reserved path names', () => {
    it('rejects single dot', () => {
      expect(isValidFileName('.').valid).toBe(false)
    })

    it('rejects double dot', () => {
      expect(isValidFileName('..').valid).toBe(false)
    })
  })

  describe('Windows reserved names', () => {
    const reserved = ['CON', 'PRN', 'AUX', 'NUL']
    for (const name of reserved) {
      it(`rejects ${name} (uppercase)`, () => {
        expect(isValidFileName(name).valid).toBe(false)
      })

      it(`rejects ${name.toLowerCase()} (lowercase)`, () => {
        expect(isValidFileName(name.toLowerCase()).valid).toBe(false)
      })

      it(`rejects ${name}.txt (with extension)`, () => {
        expect(isValidFileName(`${name}.txt`).valid).toBe(false)
      })
    }

    for (let i = 1; i <= 9; i++) {
      it(`rejects COM${i}`, () => {
        expect(isValidFileName(`COM${i}`).valid).toBe(false)
      })

      it(`rejects LPT${i}`, () => {
        expect(isValidFileName(`LPT${i}`).valid).toBe(false)
      })
    }
  })

  describe('Windows forbidden characters', () => {
    const forbidden = ['<', '>', ':', '"', '|', '?', '*']
    for (const ch of forbidden) {
      it(`rejects character "${ch}"`, () => {
        const result = isValidFileName(`file${ch}name`)
        expect(result.valid).toBe(false)
      })
    }
  })

  describe('trailing character restrictions', () => {
    it('rejects trailing space', () => {
      expect(isValidFileName('file ').valid).toBe(false)
    })

    it('rejects trailing dot', () => {
      expect(isValidFileName('file.').valid).toBe(false)
    })

    it('accepts trailing valid chars', () => {
      expect(isValidFileName('file.txt').valid).toBe(true)
    })
  })

  describe('reason field', () => {
    it('returns reason when invalid', () => {
      const result = isValidFileName('')
      expect(result.reason).toBeTruthy()
    })

    it('has no reason when valid', () => {
      const result = isValidFileName('good.txt')
      expect(result.reason).toBeUndefined()
    })
  })
})
