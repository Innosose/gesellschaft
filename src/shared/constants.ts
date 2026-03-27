/** 앱 전체에서 공유하는 상수 — 메인/렌더러 양쪽에서 import 가능 */

// ──────────────────────────────────────────────
// Tool 정의
// ──────────────────────────────────────────────

export interface ToolDef {
  id: string
  icon: string
  label: string
  color: string
  description: string
}

export const ALL_TOOLS: ToolDef[] = [
  { id: 'search',        icon: '🔍', label: '고급 검색',        color: '#0078d4', description: '파일 검색 및 탐색' },
  { id: 'cadConvert',    icon: '📐', label: 'CAD → PDF',         color: '#8764b8', description: 'DWG/DXF CAD 파일을 PDF로 변환' },
  { id: 'pdfTool',       icon: '📄', label: 'PDF 병합 / 분할',   color: '#e74c3c', description: 'PDF 병합, 분할, 편집' },
  { id: 'imageConvert',  icon: '🖼️', label: '이미지 변환',       color: '#9b59b6', description: '이미지 포맷 변환, 리사이징' },
  { id: 'excelTool',     icon: '📊', label: 'Excel / CSV',       color: '#27ae60', description: 'Excel/CSV 파일 열기, 변환, 내보내기' },
  { id: 'bulkRename',    icon: '✏️', label: '일괄 이름 변경',    color: '#038387', description: '여러 파일을 한번에 이름 변경' },
  { id: 'folderCompare', icon: '📂', label: '폴더 비교',         color: '#ca5010', description: '두 폴더의 차이점 비교' },
  { id: 'todo',          icon: '✅', label: '할일 목록',         color: '#498205', description: '할일 목록 관리' },
  { id: 'reminder',      icon: '🔔', label: '업무 리마인더',     color: '#c19c00', description: '파일 관련 업무 리마인더' },
  { id: 'notes',         icon: '📝', label: '빠른 메모',         color: '#0099bc', description: '빠른 메모 작성' },
  { id: 'snippets',      icon: '💾', label: '스니펫 관리',       color: '#16a085', description: '자주 쓰는 코드나 텍스트 스니펫 관리' },
  { id: 'emailTemplate', icon: '✉️', label: '이메일 템플릿',     color: '#8e44ad', description: '이메일 템플릿 저장 및 불러오기' },
  { id: 'clipboard',     icon: '📋', label: '클립보드 기록',     color: '#107c41', description: '클립보드 복사 기록' },
  { id: 'vatCalc',       icon: '🧮', label: '부가세 계산',       color: '#1abc9c', description: '부가세 계산' },
  { id: 'dateCalc',      icon: '📅', label: '날짜 계산기',       color: '#3498db', description: '날짜 차이, D-Day 계산' },
  { id: 'exchangeRate',  icon: '💱', label: '환율 계산',         color: '#c0392b', description: '환율 계산 및 변환' },
  { id: 'unitConverter', icon: '📏', label: '단위 변환',         color: '#d35400', description: '길이, 무게, 온도 등 단위 변환' },
  { id: 'translate',     icon: '🌐', label: '번역기',            color: '#2980b9', description: '한영 번역' },
  { id: 'textTools',     icon: '🔤', label: '텍스트 도구',       color: '#7a7574', description: '텍스트 대소문자, 공백, 줄바꿈 정리' },
  { id: 'qrCode',        icon: '🔳', label: 'QR 코드 생성',     color: '#34495e', description: 'QR 코드 생성' },
  { id: 'colorPicker',   icon: '🎨', label: '색상 피커',         color: '#e67e22', description: '색상 코드 추출 및 변환' },
  { id: 'ocr',           icon: '🔍', label: '이미지 OCR',        color: '#7f8c8d', description: '이미지에서 텍스트 추출' },
  { id: 'ai',            icon: '✦',  label: 'AI 어시스턴트',     color: '#a78bfa', description: 'AI 채팅 어시스턴트' },
]

/** id → description 매핑 (screenCapture 등에서 사용) */
export const TOOL_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  ALL_TOOLS.map(t => [t.id, t.description])
)

// ──────────────────────────────────────────────
// 앱 설정 기본값
// ──────────────────────────────────────────────

export const DEFAULT_THEME_COLOR = '#8b5cf6'
export const DEFAULT_SHORTCUT    = 'Ctrl+Shift+G'
export const DEFAULT_HUB_SIZE    = 114
export const DEFAULT_OVERLAY_OPACITY = 0.88
export const DEFAULT_SPIRAL_SCALE   = 1.0
export const DEFAULT_ANIM_SPEED     = 'normal' as const

// ──────────────────────────────────────────────
// 기능별 한계값
// ──────────────────────────────────────────────

/** 클립보드 히스토리 최대 보관 개수 */
export const CLIPBOARD_HISTORY_LIMIT = 50
/** 클립보드 폴링 간격 (ms) */
export const CLIPBOARD_POLL_INTERVAL = 1000
/** 리마인더 확인 주기 (ms) */
export const REMINDER_CHECK_INTERVAL = 60 * 1000
/** 클립보드 항목 최대 길이 */
export const CLIPBOARD_MAX_LENGTH = 10_000

/** 빠른 메모 기본 배경색 목록 */
export const QUICK_NOTE_COLORS = ['#2d2d2d', '#1a3a2a', '#1a1a3a', '#3a1a1a', '#2a2a1a'] as const

// Windows 예약 파일명 (대소문자 무관)
export const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])
