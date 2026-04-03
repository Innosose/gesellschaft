/**
 * src/shared/types.ts
 * 메인/렌더러 양쪽에서 import 가능한 통합 타입 정의
 */

// ──────────────────────────────────────────────
// UI 상태
// ──────────────────────────────────────────────

export type UIState = 'hub' | 'menu' | 'tool'

export type AnimSpeed = 'slow' | 'normal' | 'fast'

export interface DisplaySettings {
  hubSize: number
  overlayOpacity: number
  spiralScale: number
  animSpeed: AnimSpeed
}

// ──────────────────────────────────────────────
// Todo
// ──────────────────────────────────────────────

export interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

// ──────────────────────────────────────────────
// Quick Notes
// ──────────────────────────────────────────────

export interface QuickNote {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

// ──────────────────────────────────────────────
// Snippets
// ──────────────────────────────────────────────

export interface Snippet {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
}

// ──────────────────────────────────────────────
// Email Templates / Doc Templates
// ──────────────────────────────────────────────

export interface EmailTemplate {
  id: string
  title: string
  subject: string
  body: string
  createdAt: number
}

// ──────────────────────────────────────────────
// Reminders
// ──────────────────────────────────────────────

export interface Reminder {
  id: string
  text: string
  dueAt: number   // Unix ms
  done: boolean
  createdAt: number
}

// ──────────────────────────────────────────────
// File System
// ──────────────────────────────────────────────

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  mtime: number
  ext: string
}

export interface BulkRenameItem {
  path: string
  newName: string
}

// ──────────────────────────────────────────────
// Search
// ──────────────────────────────────────────────

export interface SearchOptions {
  query: string
  dir: string
  extensions?: string[]
  minSize?: number
  maxSize?: number
  dateFrom?: number
  dateTo?: number
  regex?: boolean
  content?: boolean
}

export interface SearchResult {
  path: string
  name: string
  size: number
  mtime: number
  ext: string
  matchLine?: string
}

// ──────────────────────────────────────────────
// AI
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Pomodoro
// ──────────────────────────────────────────────

export type PomodoroPhase = 'work' | 'short-break' | 'long-break'

export interface PomodoroSession {
  date: string          // YYYY-MM-DD
  completedPomodoros: number
  totalFocusMinutes: number
}

export interface PomodoroStats {
  sessions: PomodoroSession[]
}

// ──────────────────────────────────────────────
// IPC 공통 응답
// ──────────────────────────────────────────────

export interface IpcOk<T = void> {
  success: true
  data: T
}

export interface IpcErr {
  success: false
  error: string
}

export type IpcResult<T = void> = IpcOk<T> | IpcErr

// ──────────────────────────────────────────────
// Tag Store
// ──────────────────────────────────────────────

export type TagStore = Record<string, string[]>   // filePath → tags[]

// ──────────────────────────────────────────────
// Auto-Organize
// ──────────────────────────────────────────────

export interface OrganizeRule {
  id: string
  name: string
  sourceDir: string
  targetDir: string
  pattern: string
  enabled: boolean
  createdAt: number
}

// ──────────────────────────────────────────────
// Smart Folders
// ──────────────────────────────────────────────

export interface SmartFolder {
  id: string
  name: string
  options: {
    query: string
    rootPath: string
    extensions?: string[]
    minSize?: number
    maxSize?: number
    includeFiles: boolean
    includeDirs: boolean
    caseSensitive?: boolean
    regex?: boolean
    contentSearch?: boolean
  }
}
