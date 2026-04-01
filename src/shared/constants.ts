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
  // ─── 업무 핵심 ───────────────────────────────
  { id: 'ai',           icon: '✦',  label: 'AI 어시스턴트', color: '#a78bfa', description: 'AI와 대화하며 업무 질문, 문서 작성, 요약' },
  { id: 'todo',         icon: '✅', label: '할일 목록',     color: '#498205', description: '마감일·우선순위·완료율 통계 포함 할일 관리' },
  { id: 'clipboard',    icon: '📋', label: '클립보드 기록', color: '#107c41', description: '복사한 내용 히스토리 조회·즐겨찾기·재사용' },
  { id: 'memoAlarm',    icon: '📝', label: '메모 & 알림',   color: '#0099bc', description: '빠른 메모 작성 + 업무 리마인더 알림 설정' },
  { id: 'docTemplate',  icon: '📑', label: '문서 템플릿',   color: '#8e44ad', description: '이메일 양식·상용구 통합 관리 및 빠른 복사' },
  // ─── 회의·일정 ────────────────────────────────
  { id: 'meetingTimer', icon: '⏱️', label: '회의 타이머',   color: '#e67e22', description: '회의 시간·참석자별 발언 배분·안건 메모' },
  { id: 'dateTools',    icon: '📅', label: '날짜 도구',     color: '#3498db', description: 'D-Day·날짜계산·업무일 + 연차 계산 통합' },
  { id: 'translate',    icon: '🌐', label: '번역기',        color: '#2980b9', description: '한영·영한 즉시 번역' },
  // ─── 재무·세금 ────────────────────────────────
  { id: 'salaryCalc',   icon: '💰', label: '급여 계산기',   color: '#f39c12', description: '세전↔세후 실수령액, 연봉 역산, 4대보험' },
  { id: 'calculator',   icon: '🧮', label: '계산기',        color: '#1abc9c', description: '부가세·환율·단위 변환 통합 계산기' },
  // ─── 문서·파일 ────────────────────────────────
  { id: 'pdfTool',      icon: '📄', label: 'PDF 병합 / 분할', color: '#e74c3c', description: 'PDF 합치기, 나누기, 페이지 편집' },
  { id: 'excelTool',    icon: '📊', label: 'Excel / CSV',   color: '#217346', description: 'Excel·CSV 파일 열기, 필터, 내보내기' },
  { id: 'imageTools',   icon: '🖼️', label: '이미지 도구',   color: '#9b59b6', description: 'OCR·이미지변환·QR코드·색상 피커 통합' },
  // ─── 텍스트·변환 ───────────────────────────────
  { id: 'textTools',    icon: '🔤', label: '텍스트 도구',   color: '#7a7574', description: '전화번호·금액·주민번호 포맷, 공백 정리 등' },
  // ─── 파일 관리 ────────────────────────────────
  { id: 'fileManager',  icon: '📂', label: '파일 관리',     color: '#0078d4', description: '파일 검색·일괄 이름 변경·폴더 비교 통합' },
  { id: 'cadConvert',   icon: '📐', label: 'CAD → PDF',     color: '#8764b8', description: 'DWG/DXF CAD 도면을 PDF로 변환' },
  // ─── 생산성 ──────────────────────────────────
  { id: 'pomodoro',    icon: '🍅', label: '포모도로',       color: '#e74c3c', description: '25분 집중/5분 휴식 포모도로 타이머와 통계' },
  { id: 'devTools',    icon: '🛠️', label: '개발자 도구',    color: '#00bcd4', description: 'JSON·Base64·URL·해시·JWT·타임스탬프 유틸리티' },
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
