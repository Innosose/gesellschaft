/**
 * 앱 전체에서 공유하는 상수 — 메인/렌더러 양쪽에서 import 가능
 *
 * Tool metadata defined here (ALL_TOOLS).
 * Tool component registry in src/renderer/src/components/ToolPanel.tsx (TOOL_REGISTRY).
 * To add a new tool: 1) Add entry to ALL_TOOLS  2) Add lazy import to TOOL_REGISTRY
 */

export interface ToolDef {
  id: string
  icon: string
  label: string
  color: string
  description: string
}

export const ALL_TOOLS: ToolDef[] = [
  // A–Z 알파벳 순서
  { id: 'ai',           icon: '', label: 'AI Assistant',   color: '#c9a84c', description: '화면 분석, 질문, 문서 작성, 요약, 번역' },
  { id: 'batch',        icon: '', label: 'Batch',           color: '#e0a060', description: '여러 파일의 이름을 규칙에 맞춰 일괄 변경' },
  { id: 'clipboard',    icon: '', label: 'Clipboard',      color: '#5ec9a0', description: '복사한 내용을 자동으로 기록하고 재사용' },
  { id: 'diff',         icon: '', label: 'Diff',            color: '#60a0e0', description: '두 텍스트를 나란히 비교하고 차이점 강조' },
  { id: 'excelTool',    icon: '', label: 'Excel / CSV',    color: '#50a070', description: 'Excel·CSV 파일 열기, 필터, 내보내기' },
  { id: 'finder',       icon: '', label: 'Finder',          color: '#50a070', description: '컴퓨터 파일을 빠르게 검색하고 바로 열기' },
  { id: 'generator',    icon: '', label: 'Generator',       color: '#c97080', description: '안전한 비밀번호와 랜덤 숫자를 즉시 생성' },
  { id: 'haste',        icon: '', label: 'Haste',           color: '#e0a060', description: '텍스트 공백·줄바꿈 정리, 중복 제거, 정렬' },
  { id: 'imageTools',   icon: '', label: 'Image Tools',    color: '#a070c0', description: 'OCR 텍스트 인식, 이미지 변환, QR코드' },
  { id: 'jot',          icon: '', label: 'Jot',             color: '#8090b0', description: '임시 메모패드, 작업 끝나면 자동으로 사라짐' },
  { id: 'keyboard',     icon: '', label: 'Keyboard',       color: '#60c0a0', description: '단축키 목록 조회 및 커스텀 매크로 설정' },
  { id: 'launcher',     icon: '', label: 'Launcher',       color: '#c0a060', description: '자주 쓰는 앱, 폴더, URL을 빠르게 실행' },
  { id: 'memoAlarm',    icon: '', label: 'Memo & Alarm',   color: '#60a0c0', description: '빠른 메모 작성과 시간 기반 리마인더' },
  { id: 'notepin',      icon: '', label: 'Notepin',        color: '#60a0c0', description: '화면 위에 떠다니는 메모를 고정' },
  { id: 'organizer',    icon: '', label: 'Organizer',      color: '#5ec9a0', description: '할일 목록, 템플릿, 상용구 통합 관리' },
  { id: 'pdfTool',      icon: '', label: 'PDF Tools',      color: '#e06060', description: 'PDF 합치기, 나누기, 페이지 편집' },
  { id: 'quickCalc',    icon: '', label: 'Quick Calc',     color: '#5ec9a0', description: '수식을 입력하면 즉시 계산 결과' },
  { id: 'ruler',        icon: '', label: 'Ruler',           color: '#c09060', description: '화면 위 요소의 픽셀 크기와 거리 측정' },
  { id: 'stopwatch',    icon: '', label: 'Stopwatch',      color: '#e0a060', description: '타이머, 포모도로, 스톱워치, 휴식 알림' },
  { id: 'type',         icon: '', label: 'Type',            color: '#6090c0', description: '특수문자, 화살표, 수학기호, 이모지 빠른 입력' },
  { id: 'upload',       icon: '', label: 'Upload',          color: '#70a0a0', description: '파일 크기, 형식, 해상도를 업로드 전에 확인' },
  { id: 'vault',        icon: '', label: 'Vault',           color: '#a07080', description: '비밀번호와 중요 메모를 안전하게 보관' },
  { id: 'whiteboard',   icon: '', label: 'Whiteboard',      color: '#7090c0', description: '화면 위에 자유롭게 펜으로 그리고 표시' },
  { id: 'xcolor',       icon: '', label: 'X-Color',        color: '#c06080', description: '화면에서 색상 추출, 팔레트 만들기' },
  { id: 'yourInfo',     icon: '', label: 'Your Info',       color: '#80a070', description: '내 PC의 IP주소, 저장공간, 메모리, OS 정보' },
  { id: 'zone',          icon: '', label: 'Zone',            color: '#6080a0', description: '화면을 영역별로 분할하고 창 배치를 관리' },
]

/** id → description 매핑 */
export const TOOL_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  ALL_TOOLS.map(t => [t.id, t.description])
)

// ──────────────────────────────────────────────
// 앱 설정 기본값
// ──────────────────────────────────────────────

export const DEFAULT_THEME_COLOR = '#4de8c2'
export const DEFAULT_SHORTCUT    = 'Ctrl+Shift+G'
export const DEFAULT_HUB_SIZE    = 140
export const DEFAULT_OVERLAY_OPACITY = 0.88
export const DEFAULT_SPIRAL_SCALE   = 1.0
export const DEFAULT_ANIM_SPEED     = 'normal' as const

// ──────────────────────────────────────────────
// 기능별 한계값
// ──────────────────────────────────────────────

export const CLIPBOARD_HISTORY_LIMIT = 50
export const CLIPBOARD_POLL_INTERVAL = 500
export const REMINDER_CHECK_INTERVAL = 60 * 1000
export const CLIPBOARD_MAX_LENGTH = 10_000

// ──────────────────────────────────────────────
// localStorage key 레지스트리
// ──────────────────────────────────────────────

/** localStorage keys used across the app — single source of truth */
export const STORAGE_KEYS = {
  // Core app
  theme:              'gs-theme',
  favorites:          'gs-favorites',
  recentTools:        'gesellschaft-recent-tools',
  toolOrder:          'gs-tool-order',

  // Productivity
  goals:              'gs-goals',
  yearly:             'gs-yearly-events',
  bookmarks:          'gs-bookmarks',
  assignments:        'gs-assignments',
  countdowns:         'gs-countdowns',
  kanban:             'gs-kanban',
  diary:              'gs-diary',
  wishlist:           'gs-wishlist',
  contacts:           'gs-contacts',
  widgetBoard:        'gs-widget-board',
  organizer: {
    todos:            'gs-organizer-todos',
    templates:        'gs-organizer-templates',
  },
  focusSessions:      'gs-focus-sessions',
  launcherItems:      'gs-launcher-items',
  customShortcuts:    'gs-custom-shortcuts',
  zoneLayouts:        'gs-zone-layouts',
  mindmaps:           'gs-mindmaps',
  screenPins:         'gs-screen-pins',
  markdownDocs:       'gs-markdown-docs',
  codeSnippets:       'gs-code-snippets',
  colorPalettes:      'gs-color-palettes',
  quickCalcHistory:   'gs-quick-calc-history',
  weeklyReview:       'gs-weekly-review',
  expenses:           'gs-expenses',
  breakTimer:         'gs-break-timer',
  water:              'gs-water',
  stretch:            'gs-stretch',
  motivationFavs:     'gs-motivation-favs',
  worldClock:         'gs-world-clock',
  typeRecent:         'gs-type-recent',
  colorHistory:       'gs_color_history',

  // AI
  aiConversationHistory: 'ai-conversation-history',

  // Study
  studyLog:           'gesellschaft-study-log',
  studyStreak:        'gs-study-streak',
  studyGoals:         'gs-study-goals',
  studyGroups:        'gs-study-groups',
  habits:             'gs-habits',
  flashcards:         'gesellschaft-flashcards',
  formulas:           'gs-formulas',
  examSchedule:       'gs-exam-schedule',
  lectureNotes:       'gs-lecture-notes',
  reviewPlanner:      'gs-review-planner',
  timetable:          'gesellschaft-timetable',
  wrongNotes:         'gesellschaft-wrong-notes',
  readingLog:         'gs-reading-log',

  // Health
  sleep:              'gs-sleep',
  meals:              'gs-meals',
  exercise:           'gs-exercise',

  // Other
  clipboardPins:      'gesellschaft-clipboard-pins',
  recentSearches:     'gesellschaft-recent-searches',
  translateHistory:   'gesellschaft-translate-history',
} as const

export const QUICK_NOTE_COLORS = ['#12121e', '#0e1a28', '#0e0e28', '#1e0e18', '#181818'] as const

export const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])
