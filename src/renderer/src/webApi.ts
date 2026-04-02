/**
 * webApi.ts — Browser-compatible replacement for Electron's window.api
 *
 * Provides localStorage-backed implementations for data storage (todos, notes, etc.)
 * and graceful stubs for desktop-only features (file system, clipboard polling, etc.).
 * AI chat uses direct fetch to OpenAI/Anthropic APIs with streaming support.
 */

// ── Helpers ────────────────────────────────────────────

let _idCounter = Date.now()
function uid(): string { return (++_idCounter).toString(36) }

function lsGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function lsSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

const WEB_NOT_SUPPORTED = '이 기능은 웹 버전에서 지원되지 않습니다.'

// ── AI Config Storage ────────────────────────────────────

const AI_CONFIG_KEY = 'gs-web-ai-config'

interface WebAiConfig {
  provider: string
  apiKey: string
  model: string
  systemPrompt: string
  ollamaUrl: string
}

function getAiConfig(): WebAiConfig {
  return lsGet<WebAiConfig>(AI_CONFIG_KEY, {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    systemPrompt: '한국어로 답변해주세요.',
    ollamaUrl: 'http://localhost:11434',
  })
}

// ── AI Streaming via Fetch ───────────────────────────────

type ChunkCb = (text: string) => void
type DoneCb = () => void
type ErrorCb = (msg: string) => void

const aiListeners = {
  chunk: [] as ChunkCb[],
  done: [] as DoneCb[],
  error: [] as ErrorCb[],
}

let aiAbortController: AbortController | null = null

async function streamAnthropicChat(messages: { role: string; content: string }[]): Promise<void> {
  const cfg = getAiConfig()
  if (!cfg.apiKey) throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 등록해주세요.')

  aiAbortController = new AbortController()

  const apiMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: cfg.systemPrompt || '한국어로 답변해주세요.',
      messages: apiMessages,
      stream: true,
    }),
    signal: aiAbortController.signal,
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`API 오류 (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('스트리밍을 시작할 수 없습니다.')
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          aiListeners.chunk.forEach(cb => cb(parsed.delta.text))
        }
      } catch { /* skip non-JSON lines */ }
    }
  }

  aiListeners.done.forEach(cb => cb())
  aiAbortController = null
}

async function streamOpenAIChat(messages: { role: string; content: string }[]): Promise<void> {
  const cfg = getAiConfig()
  if (!cfg.apiKey) throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 등록해주세요.')

  aiAbortController = new AbortController()

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }),
    signal: aiAbortController.signal,
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`API 오류 (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('스트리밍을 시작할 수 없습니다.')
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const text = parsed.choices?.[0]?.delta?.content
        if (text) aiListeners.chunk.forEach(cb => cb(text))
      } catch { /* skip */ }
    }
  }

  aiListeners.done.forEach(cb => cb())
  aiAbortController = null
}

// ── Todo Storage ─────────────────────────────────────────

const TODO_KEY = 'gs-web-todos'
interface TodoItem { id: string; text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string; createdAt: number }

function getTodos(): TodoItem[] { return lsGet<TodoItem[]>(TODO_KEY, []) }
function saveTodos(items: TodoItem[]): TodoItem[] { lsSet(TODO_KEY, items); return items }

// ── Quick Notes Storage ──────────────────────────────────

const QN_KEY = 'gs-web-quick-notes'
interface QuickNoteItem { id: string; title: string; content: string; color: string; updatedAt: number }

function getQuickNotes(): QuickNoteItem[] { return lsGet<QuickNoteItem[]>(QN_KEY, []) }
function saveQuickNotes(items: QuickNoteItem[]): QuickNoteItem[] { lsSet(QN_KEY, items); return items }

// ── Reminders Storage ────────────────────────────────────

const REM_KEY = 'gs-web-reminders'
interface ReminderItem { id: string; filePath: string; fileName: string; note: string; remindAt: number; done: boolean }

function getReminders(): ReminderItem[] { return lsGet<ReminderItem[]>(REM_KEY, []) }
function saveReminders(items: ReminderItem[]): ReminderItem[] { lsSet(REM_KEY, items); return items }

// ── Pomodoro Storage ─────────────────────────────────────

const POMO_KEY = 'gs-web-pomodoro'
interface PomoSession { date: string; completedPomodoros: number; totalFocusMinutes: number }

function getPomoSessions(): PomoSession[] { return lsGet<PomoSession[]>(POMO_KEY, []) }

// ── Snippets Storage ─────────────────────────────────────

const SNIPPET_KEY = 'gs-web-snippets'
interface SnippetItem { id: string; title: string; content: string; tags: string[]; createdAt: number }

function getSnippets(): SnippetItem[] { return lsGet<SnippetItem[]>(SNIPPET_KEY, []) }
function saveSnippets(items: SnippetItem[]): SnippetItem[] { lsSet(SNIPPET_KEY, items); return items }

// ── Email Templates Storage ──────────────────────────────

const ETPL_KEY = 'gs-web-email-templates'
interface EmailTplItem { id: string; name: string; subject: string; body: string; createdAt: number }

function getEmailTemplates(): EmailTplItem[] { return lsGet<EmailTplItem[]>(ETPL_KEY, []) }
function saveEmailTemplates(items: EmailTplItem[]): EmailTplItem[] { lsSet(ETPL_KEY, items); return items }

// ── Clipboard (browser-limited) ──────────────────────────

const CLIP_KEY = 'gs-web-clipboard'

function getClipboardHistory(): string[] { return lsGet<string[]>(CLIP_KEY, []) }

// ── Settings Storage ─────────────────────────────────────

const SETTINGS_KEY = 'gs-web-settings'
const THEME_KEY = 'gs-web-theme-color'
const DISPLAY_KEY = 'gs-web-display'

// ── The Web API Object ───────────────────────────────────

export const webApi: Window['api'] = {
  // Window controls (no-ops in browser)
  window: {
    hide: () => {},
    minimize: () => {},
    close: () => { window.close() },
    setIgnoreMouseEvents: () => {},
  },

  // App control
  appCtrl: {
    getLoginItem: async () => false,
    setLoginItem: async () => ({ success: false }),
  },

  // Dialog
  dialog: {
    openDirectory: async () => {
      alert(WEB_NOT_SUPPORTED)
      return null
    },
  },

  // File System (stubs)
  fs: {
    readDir: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    homeDir: async () => '/home',
    delete: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    bulkRename: async () => [],
    folderSize: async () => ({ success: false, error: WEB_NOT_SUPPORTED, size: 0 }),
    typeStats: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    open: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    showInExplorer: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    onFolderSizeProgress: () => () => {},
    onTypeStatsProgress: () => () => {},
  },

  // Search (stub)
  search: {
    files: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    cancel: () => {},
    onProgress: () => () => {},
  },

  // CAD (stub)
  cadConvert: {
    openFiles: async () => [],
    openOutputDir: async () => null,
    defaultOutputDir: async () => '',
    convert: async () => [],
    openPdf: async () => {},
    onProgress: () => () => {},
  },

  // Tags (localStorage-backed)
  tags: {
    get: async (filePath: string) => lsGet<string[]>(`gs-tag:${filePath}`, []),
    set: async (filePath: string, tags: string[]) => { lsSet(`gs-tag:${filePath}`, tags); return { success: true } },
    getAllTags: async () => {
      const allTags = new Set<string>()
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('gs-tag:')) {
          const tags = lsGet<string[]>(key, [])
          tags.forEach(t => allTags.add(t))
        }
      }
      return Array.from(allTags)
    },
    findByTag: async (tag: string) => {
      const paths: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('gs-tag:')) {
          const tags = lsGet<string[]>(key, [])
          if (tags.includes(tag)) paths.push(key.slice(7))
        }
      }
      return paths
    },
  },

  // Notes (localStorage)
  notes: {
    get: async (filePath: string) => lsGet<string>(`gs-note:${filePath}`, ''),
    set: async (filePath: string, note: string) => { lsSet(`gs-note:${filePath}`, note); return { success: true } },
  },

  // Organize (stub)
  organize: {
    getRules: async () => [],
    saveRule: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    deleteRule: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    runRule: async () => ({ success: false, error: WEB_NOT_SUPPORTED, results: [] }),
  },

  // Smart Folders (stub)
  smartFolders: {
    get: async () => [],
    save: async () => [],
    delete: async () => [],
  },

  // Folder Compare (stub)
  folderCompare: {
    compare: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
  },

  // Reminders (localStorage)
  reminders: {
    get: async () => getReminders(),
    add: async (r: { filePath: string; fileName: string; note: string; remindAt: number }) => {
      const items = getReminders()
      items.push({ id: uid(), ...r, done: false })
      return saveReminders(items)
    },
    delete: async (id: string) => saveReminders(getReminders().filter(r => r.id !== id)),
    markDone: async (id: string) => saveReminders(getReminders().map(r => r.id === id ? { ...r, done: true } : r)),
  },

  // Clipboard (browser-limited)
  clipboard: {
    getHistory: async () => getClipboardHistory(),
    copy: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        const history = getClipboardHistory()
        history.unshift(text)
        lsSet(CLIP_KEY, history.slice(0, 50))
        return true
      } catch { return false }
    },
    remove: async (text: string) => {
      const h = getClipboardHistory().filter(t => t !== text)
      lsSet(CLIP_KEY, h)
      return h
    },
    clear: async () => { lsSet(CLIP_KEY, []); return [] },
    onUpdated: () => () => {},
  },

  // Todo (localStorage)
  todo: {
    get: async () => getTodos(),
    add: async (item: { text: string; done: boolean; priority: 'high' | 'normal'; dueDate?: string }) => {
      const items = getTodos()
      items.push({ id: uid(), ...item, createdAt: Date.now() })
      return saveTodos(items)
    },
    toggle: async (id: string) => saveTodos(getTodos().map(t => t.id === id ? { ...t, done: !t.done } : t)),
    delete: async (id: string) => saveTodos(getTodos().filter(t => t.id !== id)),
    clearDone: async () => saveTodos(getTodos().filter(t => !t.done)),
    update: async (id: string, text: string, priority: 'high' | 'normal', dueDate?: string) =>
      saveTodos(getTodos().map(t => t.id === id ? { ...t, text, priority, dueDate } : t)),
  },

  // Quick Notes (localStorage)
  quickNotes: {
    get: async () => getQuickNotes(),
    save: async (note: { id?: string; title?: string; content?: string; color?: string }) => {
      const items = getQuickNotes()
      if (note.id) {
        const idx = items.findIndex(n => n.id === note.id)
        if (idx >= 0) { items[idx] = { ...items[idx], ...note, updatedAt: Date.now() }; return saveQuickNotes(items) }
      }
      items.push({ id: uid(), title: note.title ?? '', content: note.content ?? '', color: note.color ?? '#12121e', updatedAt: Date.now() })
      return saveQuickNotes(items)
    },
    delete: async (id: string) => saveQuickNotes(getQuickNotes().filter(n => n.id !== id)),
  },

  // PDF Tool (stub)
  pdfTool: {
    openFiles: async () => [],
    openOutputDir: async () => null,
    defaultOutputDir: async () => '',
    merge: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    split: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    openFile: async () => {},
  },

  // Image Tool (stub)
  imageTool: {
    openFiles: async () => [],
    openOutputDir: async () => null,
    defaultOutputDir: async () => '',
    convert: async () => [],
  },

  // Excel Tool (stub)
  excelTool: {
    openFiles: async () => [],
    openOutputDir: async () => null,
    defaultOutputDir: async () => '',
    readFile: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    exportCsv: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
    exportXlsx: async () => ({ success: false, error: WEB_NOT_SUPPORTED }),
  },

  // Settings (localStorage)
  settings: {
    getShortcut: async () => lsGet<string>(SETTINGS_KEY + ':shortcut', 'Ctrl+Shift+G'),
    setShortcut: async (shortcut: string) => { lsSet(SETTINGS_KEY + ':shortcut', shortcut); return { success: true, shortcut } },
    getTheme: async () => lsGet<string>(THEME_KEY, '#4de8c2'),
    setTheme: async (color: string) => { lsSet(THEME_KEY, color); return { success: true } },
    getDisplay: async () => lsGet(DISPLAY_KEY, { hubSize: 140, overlayOpacity: 0.88, spiralScale: 1.0, animSpeed: 'normal' }),
    setDisplay: async (patch: Record<string, unknown>) => {
      const current = lsGet(DISPLAY_KEY, { hubSize: 140, overlayOpacity: 0.88, spiralScale: 1.0, animSpeed: 'normal' })
      lsSet(DISPLAY_KEY, { ...current, ...patch })
      return { success: true }
    },
  },

  // Screen capture (stub)
  screen: {
    captureAndAnalyze: async () => ({
      success: false,
      recommendations: [],
      reasons: {},
      error: '화면 캡처는 웹 버전에서 지원되지 않습니다.',
    }),
  },

  // Snippets (localStorage)
  snippets: {
    get: async () => getSnippets(),
    save: async (snippet: { id?: string; title?: string; content?: string; tags?: string[] }) => {
      const items = getSnippets()
      if (snippet.id) {
        const idx = items.findIndex(s => s.id === snippet.id)
        if (idx >= 0) { items[idx] = { ...items[idx], ...snippet } as SnippetItem; return saveSnippets(items) }
      }
      items.push({ id: uid(), title: snippet.title ?? '', content: snippet.content ?? '', tags: snippet.tags ?? [], createdAt: Date.now() })
      return saveSnippets(items)
    },
    delete: async (id: string) => saveSnippets(getSnippets().filter(s => s.id !== id)),
  },

  // Email Templates (localStorage)
  emailTemplates: {
    get: async () => getEmailTemplates(),
    save: async (tpl: { id?: string; name?: string; subject?: string; body?: string }) => {
      const items = getEmailTemplates()
      if (tpl.id) {
        const idx = items.findIndex(t => t.id === tpl.id)
        if (idx >= 0) { items[idx] = { ...items[idx], ...tpl } as EmailTplItem; return saveEmailTemplates(items) }
      }
      items.push({ id: uid(), name: tpl.name ?? '', subject: tpl.subject ?? '', body: tpl.body ?? '', createdAt: Date.now() })
      return saveEmailTemplates(items)
    },
    delete: async (id: string) => saveEmailTemplates(getEmailTemplates().filter(t => t.id !== id)),
  },

  // Pomodoro (localStorage)
  pomodoro: {
    getStats: async () => ({ sessions: getPomoSessions() }),
    saveSession: async (session: PomoSession) => {
      const sessions = getPomoSessions()
      sessions.push(session)
      lsSet(POMO_KEY, sessions)
      return { success: true }
    },
    clearStats: async () => { lsSet(POMO_KEY, []); return { success: true } },
  },

  // AI (browser streaming via fetch)
  ai: {
    getConfig: async () => getAiConfig(),
    setConfig: async (patch: Record<string, unknown>) => {
      const cfg = getAiConfig()
      const updated = { ...cfg, ...patch }
      if (patch.apiKeyRaw !== undefined) {
        updated.apiKey = patch.apiKeyRaw as string
        delete (updated as Record<string, unknown>).apiKeyRaw
      }
      lsSet(AI_CONFIG_KEY, updated)
      return { success: true }
    },
    getPresetModels: async () => ({
      anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
      ollama: [],
    }),
    getOllamaModels: async () => [],
    chat: async (messages: { role: string; content: string }[]) => {
      const cfg = getAiConfig()
      try {
        if (cfg.provider === 'openai') {
          await streamOpenAIChat(messages)
        } else {
          await streamAnthropicChat(messages)
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
        if ((e as { name?: string }).name === 'AbortError') return
        aiListeners.error.forEach(cb => cb(msg))
      }
    },
    cancel: async () => {
      aiAbortController?.abort()
      aiAbortController = null
    },
    onChunk: (cb: (text: string) => void) => {
      aiListeners.chunk.push(cb)
      return () => { aiListeners.chunk = aiListeners.chunk.filter(f => f !== cb) }
    },
    onDone: (cb: () => void) => {
      aiListeners.done.push(cb)
      return () => { aiListeners.done = aiListeners.done.filter(f => f !== cb) }
    },
    onError: (cb: (msg: string) => void) => {
      aiListeners.error.push(cb)
      return () => { aiListeners.error = aiListeners.error.filter(f => f !== cb) }
    },
  },
}

/**
 * Install the web API shim on window.api if not running in Electron.
 * Call this before React mounts.
 */
export function installWebApi(): void {
  if (typeof window !== 'undefined' && !window.api) {
    (window as Window).api = webApi
  }
}
