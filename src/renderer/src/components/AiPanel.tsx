import React, { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SavedConversation {
  id: string
  title: string
  savedAt: number
  messages: ChatMessage[]
}

const HISTORY_KEY = 'ai-conversation-history'

function loadHistory(): SavedConversation[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveToHistory(messages: ChatMessage[]): void {
  if (messages.length === 0) return
  const title = messages[0].content.slice(0, 40) + (messages[0].content.length > 40 ? '…' : '')
  const entry: SavedConversation = { id: Date.now().toString(), title, savedAt: Date.now(), messages }
  const prev = loadHistory().slice(0, 19)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev]))
}

function deleteFromHistory(id: string): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter(c => c.id !== id)))
}

interface AiConfig {
  provider: string
  apiKey: string
  model: string
  systemPrompt: string
  ollamaUrl: string
}

interface AiPanelProps {
  open?: boolean
  onClose: () => void
  asPanel?: boolean
}

export default function AiPanel({ open, onClose, asPanel = false }: AiPanelProps): React.ReactElement {
  const effectiveOpen = asPanel ? (open ?? true) : (open ?? false)
  const [tab, setTab] = useState<'chat' | 'history' | 'settings'>('chat')
  const [history, setHistory] = useState<SavedConversation[]>(loadHistory)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [presetModels, setPresetModels] = useState<Record<string, string[]>>({})
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [draft, setDraft] = useState<Partial<AiConfig & { apiKeyRaw?: string }>>({})
  const [saved, setSaved] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingTextRef = useRef('')

  // Load config and presets
  useEffect(() => {
    if (!effectiveOpen) return
    setConfigLoading(true)
    window.api.ai.getConfig().then(cfg => {
      setConfig(cfg)
      setDraft({ ...cfg })
    }).catch(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ 설정을 불러오지 못했습니다. 앱을 재시작해주세요.' }])
    }).finally(() => setConfigLoading(false))
    window.api.ai.getPresetModels().then(setPresetModels).catch(() => {})
  }, [effectiveOpen])

  // Register streaming listeners once
  useEffect(() => {
    const offChunk = window.api.ai.onChunk((text) => {
      streamingTextRef.current += text
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { role: 'assistant', content: streamingTextRef.current }]
        }
        return [...prev, { role: 'assistant', content: streamingTextRef.current }]
      })
    })
    const offDone = window.api.ai.onDone(() => {
      streamingTextRef.current = ''
      setStreaming(false)
    })
    const offError = window.api.ai.onError((msg) => {
      streamingTextRef.current = ''
      setStreaming(false)
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    })
    return () => { offChunk(); offDone(); offError() }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (effectiveOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [effectiveOpen])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setStreaming(true)
    streamingTextRef.current = ''
    await window.api.ai.chat(newMessages)
  }, [input, streaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    if (e.key === 'Escape' && !asPanel) onClose()
  }

  const handleCancel = (): void => {
    window.api.ai.cancel()
    setStreaming(false)
  }

  const handleSaveConfig = async (): Promise<void> => {
    await window.api.ai.setConfig(draft as Record<string, unknown>)
    const updated = await window.api.ai.getConfig()
    setConfig(updated)
    setDraft({ ...updated })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const loadOllamaModels = async (): Promise<void> => {
    const models = await window.api.ai.getOllamaModels()
    setOllamaModels(models)
  }

  const provider = (draft.provider ?? config?.provider) as string
  const models = provider === 'ollama' ? ollamaModels : (presetModels[provider] ?? [])

  // asPanel mode: render as inline panel
  if (asPanel) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(14,12,26,0.97)' }}>
        {/* Tab header */}
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}>
          {(['chat', 'history', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '4px 14px',
                borderRadius: 14,
                border: tab === t ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                background: tab === t ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: tab === t ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.4)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6,
                transition: 'all 0.15s ease',
              }}
            >
              {t === 'chat' ? '채팅' : t === 'history' ? '기록' : '설정'}
            </button>
          ))}
        </div>

        {/* Chat Tab */}
        {tab === 'chat' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                  <div>무엇이든 질문해보세요</div>
                  <div style={{ marginTop: 6, fontSize: 11 }}>Shift+Enter로 줄바꿈</div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {msg.role === 'user' ? '나' : '🤖'}
                  </div>
                  <div style={{
                    maxWidth: '82%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.6,
                    background: msg.role === 'user' ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                    border: msg.role === 'user' ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                    {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                      <span style={{ display: 'inline-block', width: 6, height: 12, background: 'rgba(139,92,246,0.8)', marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {messages.length > 0 && (
              <div style={{ padding: '0 14px 6px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { saveToHistory(messages); setHistory(loadHistory()); }}
                  style={{ fontSize: 11, color: 'rgba(139,92,246,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                >💾 저장</button>
                <button
                  onClick={() => setMessages([])}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                >초기화</button>
              </div>
            )}

            <div style={{
              padding: '10px 14px 14px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(20,18,36,0.9)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지 입력... (Enter로 전송)"
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', padding: '8px 10px', fontSize: 12,
                    borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)',
                    outline: 'none', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
                {streaming ? (
                  <button
                    onClick={handleCancel}
                    style={{
                      height: 54, width: 50, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#c0392b', color: '#fff', fontSize: 18, flexShrink: 0,
                    }}
                  >⏹</button>
                ) : (
                  <button
                    onClick={send}
                    disabled={!input.trim()}
                    style={{
                      height: 54, width: 50, borderRadius: 6, border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                      background: input.trim() ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.05)',
                      color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontSize: 18, flexShrink: 0,
                      transition: 'background 0.12s ease',
                    }}
                  >↑</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 40 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                <div>저장된 대화가 없습니다</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>채팅 창에서 💾 저장 버튼을 누르세요</div>
              </div>
            ) : history.map(conv => (
              <div key={conv.id} style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
              onClick={() => { setMessages(conv.messages); setTab('chat') }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {new Date(conv.savedAt).toLocaleDateString('ko-KR')} · {conv.messages.length}개 메시지
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteFromHistory(conv.id); setHistory(loadHistory()) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && configLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            설정 로딩 중...
          </div>
        )}
        {tab === 'settings' && !configLoading && config && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>AI 제공자</label>
                <select
                  value={draft.provider ?? ''}
                  onChange={e => setDraft(d => ({ ...d, provider: e.target.value, model: '' }))}
                  style={{ width: '100%', height: 30, fontSize: 12, padding: '0 8px', background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama (로컬)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>
                  모델
                  {provider === 'ollama' && (
                    <button onClick={loadOllamaModels} style={{ marginLeft: 8, fontSize: 10, color: 'rgba(139,92,246,0.8)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      새로고침
                    </button>
                  )}
                </label>
                {models.length > 0 ? (
                  <select
                    value={draft.model ?? ''}
                    onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                    style={{ width: '100%', height: 30, fontSize: 12, padding: '0 8px', background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}
                  >
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input
                    value={draft.model ?? ''}
                    onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                    placeholder="모델명 입력..."
                    style={{ width: '100%', height: 30, fontSize: 12, background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '0 8px', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {provider !== 'ollama' && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>API 키</label>
                  <input
                    type="password"
                    value={draft.apiKeyRaw ?? ''}
                    onChange={e => setDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                    placeholder={config.apiKey ? `현재: ••••${config.apiKey.slice(-4)}` : '키 입력...'}
                    style={{ width: '100%', height: 30, fontSize: 12, background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '0 8px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                    비워두면 기존 키 유지
                  </div>
                </div>
              )}

              {provider === 'ollama' && (
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>Ollama URL</label>
                  <input
                    value={draft.ollamaUrl ?? ''}
                    onChange={e => setDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                    style={{ width: '100%', height: 30, fontSize: 12, background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '0 8px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>시스템 프롬프트</label>
                <textarea
                  value={draft.systemPrompt ?? ''}
                  onChange={e => setDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', fontSize: 12, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5, fontFamily: 'inherit', background: 'rgba(20,18,36,0.9)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handleSaveConfig}
                style={{ height: 34, fontSize: 12, background: 'rgba(139,92,246,0.2)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                {saved ? '✓ 저장됨' : '설정 저장'}
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  // Default (modal slide-in) mode
  return (
    <>
      {/* Backdrop */}
      {effectiveOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.35)',
            animation: 'fadeIn 0.15s ease',
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 32, // below title bar
          right: 0,
          bottom: 0,
          width: 380,
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--win-surface)',
          borderLeft: '1px solid var(--win-border)',
          transform: effectiveOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: effectiveOpen ? '-4px 0 24px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 42,
          padding: '0 14px',
          borderBottom: '1px solid var(--win-border)',
          background: 'var(--win-surface-2)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>🤖 AI 어시스턴트</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setTab('chat')}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: tab === 'chat' ? 'var(--win-accent)' : 'transparent',
                color: tab === 'chat' ? '#fff' : 'var(--win-text-sub)',
              }}
            >채팅</button>
            <button
              onClick={() => setTab('settings')}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: tab === 'settings' ? 'var(--win-accent)' : 'transparent',
                color: tab === 'settings' ? '#fff' : 'var(--win-text-sub)',
              }}
            >설정</button>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 10, width: 24, height: 24, borderRadius: 4, border: 'none',
              background: 'transparent', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 14,
            }}
          >✕</button>
        </div>

        {/* Chat Tab */}
        {tab === 'chat' && (
          <>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 12, marginTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                  <div>무엇이든 질문해보세요</div>
                  <div style={{ marginTop: 6, fontSize: 11 }}>Shift+Enter로 줄바꿈</div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'var(--win-accent)' : 'var(--win-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, border: '1px solid var(--win-border)',
                  }}>
                    {msg.role === 'user' ? '나' : '🤖'}
                  </div>
                  <div style={{
                    maxWidth: '82%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.6,
                    background: msg.role === 'user' ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                    color: 'var(--win-text)',
                    border: '1px solid var(--win-border)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                    {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                      <span style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--win-accent)', marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Clear button */}
            {messages.length > 0 && (
              <div style={{ padding: '0 14px 6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setMessages([])}
                  style={{ fontSize: 11, color: 'var(--win-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                >대화 초기화</button>
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: '10px 14px 14px',
              borderTop: '1px solid var(--win-border)',
              background: 'var(--win-surface-2)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지 입력... (Enter로 전송)"
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', padding: '8px 10px', fontSize: 12,
                    borderRadius: 6, border: '1px solid var(--win-border)',
                    background: 'var(--win-surface)', color: 'var(--win-text)',
                    outline: 'none', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
                {streaming ? (
                  <button
                    onClick={handleCancel}
                    style={{
                      height: 54, width: 50, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#c0392b', color: '#fff', fontSize: 18, flexShrink: 0,
                    }}
                  >⏹</button>
                ) : (
                  <button
                    onClick={send}
                    disabled={!input.trim()}
                    style={{
                      height: 54, width: 50, borderRadius: 6, border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                      background: input.trim() ? 'var(--win-accent)' : 'var(--win-surface)',
                      color: input.trim() ? '#fff' : 'var(--win-text-muted)',
                      fontSize: 18, flexShrink: 0,
                      transition: 'background 0.12s ease',
                    }}
                  >↑</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && configLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 12 }}>
            설정 로딩 중...
          </div>
        )}
        {tab === 'settings' && !configLoading && config && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Provider */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 5 }}>AI 제공자</label>
                <select
                  className="win-input"
                  value={draft.provider ?? ''}
                  onChange={e => setDraft(d => ({ ...d, provider: e.target.value, model: '' }))}
                  style={{ width: '100%', height: 30, fontSize: 12, padding: '0 8px' }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama (로컬)</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 5 }}>
                  모델
                  {provider === 'ollama' && (
                    <button onClick={loadOllamaModels} style={{ marginLeft: 8, fontSize: 10, color: 'var(--win-accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      새로고침
                    </button>
                  )}
                </label>
                {models.length > 0 ? (
                  <select
                    className="win-input"
                    value={draft.model ?? ''}
                    onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                    style={{ width: '100%', height: 30, fontSize: 12, padding: '0 8px' }}
                  >
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input
                    className="win-input"
                    value={draft.model ?? ''}
                    onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
                    placeholder="모델명 입력..."
                    style={{ width: '100%', height: 30, fontSize: 12 }}
                  />
                )}
              </div>

              {/* API Key */}
              {provider !== 'ollama' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 5 }}>API 키</label>
                  <input
                    className="win-input"
                    type="password"
                    value={draft.apiKeyRaw ?? ''}
                    onChange={e => setDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                    placeholder={config.apiKey ? `현재: ••••${config.apiKey.slice(-4)}` : '키 입력...'}
                    style={{ width: '100%', height: 30, fontSize: 12 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 3 }}>
                    비워두면 기존 키 유지
                  </div>
                </div>
              )}

              {/* Ollama URL */}
              {provider === 'ollama' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 5 }}>Ollama URL</label>
                  <input
                    className="win-input"
                    value={draft.ollamaUrl ?? ''}
                    onChange={e => setDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                    style={{ width: '100%', height: 30, fontSize: 12 }}
                  />
                </div>
              )}

              {/* System Prompt */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 5 }}>시스템 프롬프트</label>
                <textarea
                  className="win-input"
                  value={draft.systemPrompt ?? ''}
                  onChange={e => setDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', fontSize: 12, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>

              {/* Save button */}
              <button
                className="win-btn"
                onClick={handleSaveConfig}
                style={{ height: 34, fontSize: 12 }}
              >
                {saved ? '✓ 저장됨' : '설정 저장'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
