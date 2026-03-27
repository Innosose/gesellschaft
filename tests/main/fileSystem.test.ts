/**
 * fileSystem.ts — isValidFileName 로직 단위 테스트
 * (실제 fs 호출 없이 파일명 검증 로직만 테스트)
 */
import { WINDOWS_RESERVED_NAMES } from '../../src/shared/constants'

/** fileSystem.ts 내부 함수와 동일한 로직 — 검증만 추출 */
function isValidFileName(name: string): { valid: boolean; reason?: string } {
  if (!name || name.trim() === '') return { valid: false, reason: '빈 파일명' }
  if (name.includes('/') || name.includes('\\')) return { valid: false, reason: '경로 구분자 포함' }
  if (name === '.' || name === '..') return { valid: false, reason: '예약된 경로 이름' }
  const baseName = name.split('.')[0].toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(baseName)) return { valid: false, reason: `Windows 예약 파일명: ${baseName}` }
  if (/[<>:"|?*]/.test(name)) return { valid: false, reason: 'Windows 금지 문자 포함' }
  if (/[. ]$/.test(name)) return { valid: false, reason: '파일명 끝에 공백 또는 마침표 불가' }
  return { valid: true }
}

describe('isValidFileName', () => {
  describe('유효한 파일명', () => {
    it('일반 파일명', () => {
      expect(isValidFileName('hello.txt').valid).toBe(true)
      expect(isValidFileName('보고서_2024.docx').valid).toBe(true)
      expect(isValidFileName('image-001.png').valid).toBe(true)
    })

    it('확장자 없는 파일명', () => {
      expect(isValidFileName('Makefile').valid).toBe(true)
      expect(isValidFileName('README').valid).toBe(true)
    })
  })

  describe('빈 값 거부', () => {
    it('빈 문자열', () => {
      expect(isValidFileName('').valid).toBe(false)
    })

    it('공백만 있는 문자열', () => {
      expect(isValidFileName('   ').valid).toBe(false)
    })
  })

  describe('경로 구분자 거부', () => {
    it('슬래시 포함', () => {
      expect(isValidFileName('path/to/file').valid).toBe(false)
    })

    it('백슬래시 포함', () => {
      expect(isValidFileName('path\\file').valid).toBe(false)
    })
  })

  describe('예약 경로 거부', () => {
    it('. 이름', () => {
      expect(isValidFileName('.').valid).toBe(false)
    })

    it('.. 이름', () => {
      expect(isValidFileName('..').valid).toBe(false)
    })
  })

  describe('Windows 예약 파일명 거부', () => {
    it('CON', () => {
      expect(isValidFileName('CON').valid).toBe(false)
      expect(isValidFileName('con').valid).toBe(false)
      expect(isValidFileName('Con.txt').valid).toBe(false)
    })

    it('PRN, AUX, NUL', () => {
      expect(isValidFileName('PRN').valid).toBe(false)
      expect(isValidFileName('AUX').valid).toBe(false)
      expect(isValidFileName('NUL').valid).toBe(false)
    })

    it('COM1~COM9', () => {
      for (let i = 1; i <= 9; i++) {
        expect(isValidFileName(`COM${i}`).valid).toBe(false)
        expect(isValidFileName(`com${i}.txt`).valid).toBe(false)
      }
    })

    it('LPT1~LPT9', () => {
      for (let i = 1; i <= 9; i++) {
        expect(isValidFileName(`LPT${i}`).valid).toBe(false)
      }
    })
  })

  describe('Windows 금지 문자 거부', () => {
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*']
    for (const ch of invalidChars) {
      it(`'${ch}' 포함`, () => {
        expect(isValidFileName(`file${ch}name`).valid).toBe(false)
      })
    }
  })

  describe('끝 문자 제한', () => {
    it('끝에 공백', () => {
      expect(isValidFileName('file ').valid).toBe(false)
    })

    it('끝에 마침표', () => {
      expect(isValidFileName('file.').valid).toBe(false)
    })
  })
})
