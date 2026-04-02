import React, { useEffect, useRef, useState, useCallback } from 'react'
import { T, rgba } from '../utils/theme'
import type { AiConfig, ChatMessage } from '../../../shared/types'
import AiChatInput from './AiChatInput'
import AiMessageList from './AiMessageList'
import AiHistoryDrawer, { type SavedConversation } from './AiHistoryDrawer'
import AiConfigSection from './AiConfigSection'

type Draft = Partial<AiConfig & { apiKeyRaw?: string }>

const HISTORY_KEY    = 'ai-conversation-history'
const MAX_MESSAGES   = 100
const COLLAPSED_KEEP = 80

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

function exportChat(messages: ChatMessage[]): void {
  const lines: string[] = [`# AI 대화 내보내기`, `날짜: ${new Date().toLocaleString('ko-KR')}`, '']
  messages.forEach(m => {
    lines.push(`## ${m.role === 'user' ? '나' : 'AI'}`)
    lines.push(m.content)
    lines.push('')
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-chat-${Date.now()}.txt`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
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
  const [draft, setDraft] = useState<Draft>({})
  const [saved, setSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingTextRef = useRef('')
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (streamingTimeoutRef.current !== null) clearTimeout(streamingTimeoutRef.current)
      streamingTimeoutRef.current = setTimeout(() => {
        streamingTimeoutRef.current = null
        streamingTextRef.current = ''
        setStreaming(false)
        setMessages(prev => [...prev, { role: 'assistant', content: '응답 대기 시간을 초과했습니다. (90초)' }])
      }, 90_000)
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
      if (streamingTimeoutRef.current !== null) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null }
      streamingTextRef.current = ''
      setStreaming(false)
    })
    const offError = window.api.ai.onError((msg) => {
      if (streamingTimeoutRef.current !== null) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null }
      streamingTextRef.current = ''
      setStreaming(false)
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    })
    return () => {
      offChunk(); offDone(); offError()
      if (streamingTimeoutRef.current !== null) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null }
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (!effectiveOpen) return
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [effectiveOpen])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setStreaming(true)
    streamingTextRef.current = ''
    if (streamingTimeoutRef.current !== null) clearTimeout(streamingTimeoutRef.current)
    streamingTimeoutRef.current = setTimeout(() => {
      streamingTimeoutRef.current = null
      streamingTextRef.current = ''
      setStreaming(false)
      setMessages(prev => [...prev, { role: 'assistant', content: '응답 대기 시간을 초과했습니다. (90초)' }])
    }, 90_000)
    try {
      await window.api.ai.chat(newMessages)
    } catch (e: unknown) {
      if (streamingTimeoutRef.current !== null) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null }
      streamingTextRef.current = ''
      setStreaming(false)
      const msg = e instanceof Error ? e.message : '전송 오류가 발생했습니다.'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    }
  }, [input, streaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape' && !asPanel) onClose()
  }

  const handleCancel = (): void => {
    if (streamingTimeoutRef.current !== null) { clearTimeout(streamingTimeoutRef.current); streamingTimeoutRef.current = null }
    window.api.ai.cancel()
    setStreaming(false)
  }

  const handleSaveConfig = async (): Promise<void> => {
    try {
      await window.api.ai.setConfig(draft as Record<string, unknown>)
      const updated = await window.api.ai.getConfig()
      setConfig(updated)
      setDraft({ ...updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* silently ignore */ }
  }

  const loadOllamaModels = async (): Promise<void> => {
    try { setOllamaModels(await window.api.ai.getOllamaModels()) }
    catch { setOllamaModels([]) }
  }

  const handleSaveConversation = useCallback((): void => {
    saveToHistory(messages)
    setHistory(loadHistory())
  }, [messages])

  const handleClearMessages = useCallback((): void => {
    setMessages([])
    setShowAll(false)
  }, [])

  const handleLoadConversation = useCallback((conv: SavedConversation): void => {
    setMessages(conv.messages)
    setShowAll(false)
    setTab('chat')
  }, [])

  const handleDeleteConversation = useCallback((id: string): void => {
    deleteFromHistory(id)
    setHistory(loadHistory())
  }, [])

  // Common derived values used in both render branches
  const hiddenCount = (!showAll && messages.length > MAX_MESSAGES) ? messages.length - COLLAPSED_KEEP : 0
  const visibleMessages = hiddenCount > 0 ? messages.slice(hiddenCount) : messages
  const provider = (draft.provider ?? config?.provider ?? '') as string
  const models = provider === 'ollama' ? ollamaModels : (presetModels[provider] ?? [])

  // ── asPanel mode ────────────────────────────────────────────────────────────
  if (asPanel) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: rgba(T.bg, 0.97) }}>
        {/* Tab header */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 0,
          padding: '0 20px', borderBottom: `1px solid ${rgba(T.fg, 0.14)}`,
          background: rgba(T.fg, 0.04), flexShrink: 0,
        }}>
          {(['chat', 'history', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 14px', borderRadius: 14,
                border: tab === t ? `1px solid ${rgba(T.gold, 0.4)}` : '1px solid transparent',
                background: tab === t ? rgba(T.gold, 0.2) : 'transparent',
                color: tab === t ? 'rgba(220,200,140,0.9)' : rgba(T.fg, 0.65),
                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6,
                transition: 'all 0.15s ease', minHeight: 44, lineHeight: 1.4,
              }}
            >
              {t === 'chat' ? '채팅' : t === 'history' ? '기록' : '설정'}
            </button>
          ))}
        </div>

        {tab === 'chat' && (
          <>
            <AiMessageList
              messages={messages}
              visibleMessages={visibleMessages}
              hiddenCount={hiddenCount}
              streaming={streaming}
              onShowAll={() => setShowAll(true)}
              onSave={handleSaveConversation}
              onExport={() => exportChat(messages)}
              onClear={handleClearMessages}
              bottomRef={bottomRef}
              dark
            />
            <AiChatInput
              input={input}
              setInput={setInput}
              streaming={streaming}
              onSend={send}
              onCancel={handleCancel}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              dark
            />
          </>
        )}

        {tab === 'history' && (
          <AiHistoryDrawer
            history={history}
            onLoad={handleLoadConversation}
            onDelete={handleDeleteConversation}
            dark
          />
        )}

        {tab === 'settings' && (
          <AiConfigSection
            config={config}
            draft={draft}
            setDraft={setDraft}
            loading={configLoading}
            saved={saved}
            models={models}
            provider={provider}
            onSave={handleSaveConfig}
            onLoadOllamaModels={loadOllamaModels}
            dark
          />
        )}

        <style>{`
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>
      </div>
    )
  }

  // ── Default (modal slide-in) mode ───────────────────────────────────────────
  return (
    <>
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

      <div style={{
        position: 'fixed', top: 32, right: 0, bottom: 0, width: 380, zIndex: 201,
        display: 'flex', flexDirection: 'column',
        background: 'var(--win-surface)', borderLeft: '1px solid var(--win-border)',
        transform: effectiveOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)',
        boxShadow: effectiveOpen ? '-4px 0 24px rgba(0,0,0,0.4)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 42,
          padding: '0 14px', borderBottom: '1px solid var(--win-border)',
          background: 'var(--win-surface-2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>AI 어시스턴트</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['chat', 'settings'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontSize: 11, padding: '8px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--win-accent)' : 'transparent',
                  color: tab === t ? T.fg : 'var(--win-text-sub)',
                  minHeight: 44, lineHeight: 1.4,
                }}
              >{t === 'chat' ? '채팅' : '설정'}</button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 10, width: 44, height: 44, borderRadius: 4, border: 'none',
              background: 'transparent', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {tab === 'chat' && (
          <>
            <AiMessageList
              messages={messages}
              visibleMessages={visibleMessages}
              hiddenCount={hiddenCount}
              streaming={streaming}
              onShowAll={() => setShowAll(true)}
              onSave={handleSaveConversation}
              onExport={() => exportChat(messages)}
              onClear={handleClearMessages}
              bottomRef={bottomRef}
            />
            <AiChatInput
              input={input}
              setInput={setInput}
              streaming={streaming}
              onSend={send}
              onCancel={handleCancel}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
            />
          </>
        )}

        {tab === 'settings' && (
          <AiConfigSection
            config={config}
            draft={draft}
            setDraft={setDraft}
            loading={configLoading}
            saved={saved}
            models={models}
            provider={provider}
            onSave={handleSaveConfig}
            onLoadOllamaModels={loadOllamaModels}
          />
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  )
}
