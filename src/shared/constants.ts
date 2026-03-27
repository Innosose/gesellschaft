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
  { id: 'ai',            icon: '✦',  label: 'AI 어시스턴트',     color: '#a78bfa', description: 'AI와 대화하며 업무 질문, 문서 작성, 요약' },
  { id: 'todo',          icon: '✅', label: '할일 목록',         color: '#498205', description: '업무 할일과 우선순위 관리' },
  { id: 'notes',         icon: '📝', label: '빠른 메모',         color: '#0099bc', description: '아이디어·회의 내용 즉시 메모' },
  { id: 'reminder',      icon: '🔔', label: '업무 리마인더',     color: '#c19c00', description: '마감일·중요 일정 알림 설정' },
  { id: 'clipboard',     icon: '📋', label: '클립보드 기록',     color: '#107c41', description: '복사한 내용 히스토리 조회 및 재사용' },
  // ─── 커뮤니케이션 ──────────────────────────────
  { id: 'emailTemplate', icon: '✉️', label: '이메일 템플릿',     color: '#8e44ad', description: '자주 쓰는 이메일 양식 저장 및 불러오기' },
  { id: 'snippets',      icon: '💬', label: '상용구 관리',       color: '#16a085', description: '자주 쓰는 업무 문구·인사말·보고서 문장 관리' },
  { id: 'translate',     icon: '🌐', label: '번역기',            color: '#2980b9', description: '한영·영한 즉시 번역' },
  // ─── 회의·일정 ────────────────────────────────
  { id: 'meetingTimer',  icon: '⏱️', label: '회의 타이머',       color: '#e67e22', description: '회의 시간 관리, 안건 메모' },
  { id: 'dateCalc',      icon: '📅', label: '날짜 계산기',       color: '#3498db', description: 'D-Day, 날짜 차이, 업무일 계산' },
  { id: 'annualLeave',   icon: '🏖️', label: '연차 계산기',       color: '#27ae60', description: '근속 연수별 연차 발생일수·잔여 연차 계산' },
  // ─── 재무·세금 ────────────────────────────────
  { id: 'vatCalc',       icon: '🧮', label: '부가세 계산',       color: '#1abc9c', description: '공급가액·부가세·합계 계산' },
  { id: 'salaryCalc',    icon: '💰', label: '급여 계산기',       color: '#f39c12', description: '세전→세후 실수령액, 4대보험·소득세 계산' },
  { id: 'exchangeRate',  icon: '💱', label: '환율 계산',         color: '#c0392b', description: '실시간 환율로 외화 금액 변환' },
  // ─── 문서·파일 ────────────────────────────────
  { id: 'pdfTool',       icon: '📄', label: 'PDF 병합 / 분할',   color: '#e74c3c', description: 'PDF 합치기, 나누기, 페이지 편집' },
  { id: 'excelTool',     icon: '📊', label: 'Excel / CSV',       color: '#217346', description: 'Excel·CSV 파일 열기, 필터, 내보내기' },
  { id: 'ocr',           icon: '🔍', label: '이미지 → 텍스트',   color: '#7f8c8d', description: '이미지·스캔 문서에서 텍스트 추출 (OCR)' },
  { id: 'qrCode',        icon: '🔳', label: 'QR 코드 생성',     color: '#34495e', description: 'URL·연락처·텍스트를 QR 코드로 변환' },
  { id: 'imageConvert',  icon: '🖼️', label: '이미지 변환',       color: '#9b59b6', description: '이미지 포맷 변환, 크기 조정, 압축' },
  // ─── 텍스트·도구 ───────────────────────────────
  { id: 'textTools',     icon: '🔤', label: '텍스트 도구',       color: '#7a7574', description: '전화번호 포맷, 금액 변환, 공백 정리 등' },
  { id: 'unitConverter', icon: '📏', label: '단위 변환',         color: '#d35400', description: '길이·무게·온도·넓이 단위 변환' },
  // ─── 파일 관리 ────────────────────────────────
  { id: 'search',        icon: '🔍', label: '파일 검색',         color: '#0078d4', description: '파일명·내용·날짜로 파일 고속 검색' },
  { id: 'bulkRename',    icon: '✏️', label: '일괄 이름 변경',    color: '#038387', description: '파일 여러 개를 규칙에 따라 한번에 이름 변경' },
  { id: 'folderCompare', icon: '📂', label: '폴더 비교',         color: '#ca5010', description: '두 폴더의 파일 차이·중복 비교' },
  { id: 'cadConvert',    icon: '📐', label: 'CAD → PDF',         color: '#8764b8', description: 'DWG/DXF CAD 도면을 PDF로 변환' },
  { id: 'colorPicker',   icon: '🎨', label: '색상 피커',         color: '#e67e22', description: '색상 코드(HEX·RGB·HSV) 추출 및 변환' },
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
