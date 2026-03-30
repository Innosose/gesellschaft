import { WINDOWS_RESERVED_NAMES } from './constants'

/** Windows/Linux 모두 안전한 파일명인지 검사 */
export function isValidFileName(name: string): { valid: boolean; reason?: string } {
  if (!name || name.trim() === '') return { valid: false, reason: '빈 파일명' }
  if (name.includes('/') || name.includes('\\')) return { valid: false, reason: '경로 구분자 포함' }
  if (name === '.' || name === '..') return { valid: false, reason: '예약된 경로 이름' }
  const baseName = name.split('.')[0].toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(baseName)) return { valid: false, reason: `Windows 예약 파일명: ${baseName}` }
  if (/[<>:"|?*]/.test(name)) return { valid: false, reason: 'Windows 금지 문자 포함' }
  if (/[. ]$/.test(name)) return { valid: false, reason: '파일명 끝에 공백 또는 마침표 불가' }
  return { valid: true }
}
