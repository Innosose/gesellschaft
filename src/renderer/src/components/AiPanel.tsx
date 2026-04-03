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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>
        {/* Tab header */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', gap: 0,
          padding: '0 16px', borderBottom: '0.33px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 2 }}>
          {(['chat', 'history', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 18px', borderRadius: 8,
                border: 'none',
                background: tab === t ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.50)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s ease', minHeight: 30,
              }}
            >
              {t === 'chat' ? '채팅' : t === 'history' ? '기록' : '설정'}
            </button>
          ))}
          </div>
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
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      <div style={{
        position: 'fixed', top: 32, right: 0, bottom: 0, width: 'min(380px, 85vw)', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        background: '#1c1c1e',
        borderLeft: '0.33px solid rgba(255,255,255,0.06)',
        borderRadius: '16px 0 0 0',
        transform: effectiveOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: effectiveOpen ? '0 24px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 48,
          padding: '0 16px', borderBottom: '0.33px solid rgba(255,255,255,0.06)',
          minHeight: 48,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, flex: 1, color: '#ffffff' }}>AI</span>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 2 }}>
            {(['chat', 'settings'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontSize: 13, padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.50)',
                  fontWeight: 500,
                  transition: 'all 0.2s ease', minHeight: 30,
                }}
              >{t === 'chat' ? '채팅' : '설정'}</button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 10, width: 30, height: 30, borderRadius: 15, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
            }}
          ><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/></svg></button>
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
