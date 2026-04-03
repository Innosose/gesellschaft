/**
 * src/shared/types.ts
 * 메인/렌더러 양쪽에서 import하는 공유 타입 정의
 *
 * 원칙: 실제로 여러 프로세스에서 import하는 타입만 여기에 둡니다.
 * 단일 파일에서만 사용되는 타입은 해당 파일에 로컬로 정의합니다.
 */

// ── AI ──────────────────────────────────────────

export interface AiConfig {
  provider: string
  apiKey: string
  model: string
  systemPrompt: string
  ollamaUrl: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ── Pomodoro ────────────────────────────────────

export interface PomodoroSession {
  date: string          // YYYY-MM-DD
  completedPomodoros: number
  totalFocusMinutes: number
}

export interface PomodoroStats {
  sessions: PomodoroSession[]
}
