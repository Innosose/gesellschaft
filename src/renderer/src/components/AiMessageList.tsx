import React, { memo } from 'react'
import { T, rgba } from '../utils/theme'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../../../shared/types'

// ── Code block with copy button ────────────────────────────────────────────
function CodeBlock({ code }: { code: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false)
  return (
    <div style={{ position: 'relative', margin: '6px 0' }}>
      <pre style={{ margin: 0, padding: '12px 16px', borderRadius: 8, overflowX: 'auto', fontSize: 12, lineHeight: 1.6, background: 'rgba(255,255,255,0.04)', border: 'none' }}>
        <code style={{ fontFamily: 'ui-monospace, "SF Mono", monospace' }}>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{ position: 'absolute', top: 6, right: 6, fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.08)', color: copied ? '#30d158' : 'rgba(255,255,255,0.60)', fontWeight: 500, transition: 'all 0.15s' }}
      >{copied ? '✓' : '복사'}</button>
    </div>
  )
}

// ── Memoized markdown renderer ─────────────────────────────────────────────
export const MarkdownMessage = memo(function MarkdownMessage({ content, dark }: { content: string; dark?: boolean }): React.ReactElement {
  const textColor  = 'rgba(255,255,255,0.92)'
  const mutedColor = 'rgba(255,255,255,0.60)'
  return (
    <ReactMarkdown
      components={{
        p:          ({ children }) => <p style={{ margin: '3px 0', lineHeight: 1.4, color: textColor }}>{children}</p>,
        strong:     ({ children }) => <strong style={{ fontWeight: 600, color: textColor }}>{children}</strong>,
        em:         ({ children }) => <em style={{ color: mutedColor }}>{children}</em>,
        ul:         ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 18, color: textColor }}>{children}</ul>,
        ol:         ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 18, color: textColor }}>{children}</ol>,
        li:         ({ children }) => <li style={{ margin: '1px 0', lineHeight: 1.4 }}>{children}</li>,
        h1:         ({ children }) => <h1 style={{ fontSize: 17, fontWeight: 700, margin: '8px 0 3px', color: textColor }}>{children}</h1>,
        h2:         ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: textColor }}>{children}</h2>,
        h3:         ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 2px', color: textColor }}>{children}</h3>,
        code:       ({ children, className }) => {
          const isBlock = className?.startsWith('language-') || (typeof children === 'string' && (children as string).includes('\n'))
          if (isBlock) return <CodeBlock code={String(children).trimEnd()} />
          return <code style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', fontFamily: 'ui-monospace, "SF Mono", monospace', color: textColor }}>{children}</code>
        },
        pre:        ({ children }) => <>{children}</>,
        blockquote: ({ children }) => <blockquote style={{ margin: '4px 0', paddingLeft: 12, borderLeft: '3px solid rgba(255,255,255,0.12)', color: mutedColor }}>{children}</blockquote>,
        hr:         () => <hr style={{ border: 'none', borderTop: '0.33px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />,
      }}
    >{content}</ReactMarkdown>
  )
})

// ── Main props ─────────────────────────────────────────────────────────────
interface AiMessageListProps {
  messages: ChatMessage[]
  visibleMessages: ChatMessage[]
  hiddenCount: number
  streaming: boolean
  onShowAll: () => void
  onSave: () => void
  onExport: () => void
  onClear: () => void
  bottomRef: React.RefObject<HTMLDivElement | null>
  dark?: boolean
}

export default function AiMessageList({
  messages, visibleMessages, hiddenCount, streaming,
  onShowAll, onSave, onExport, onClear,
  bottomRef, dark = false,
}: AiMessageListProps): React.ReactElement {
  const accent = T.teal

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.40)', fontSize: 15, marginTop: 80 }}>
            <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.6 }}>💬</div>
            <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.60)', fontSize: 17 }}>무엇이든 질문해보세요</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.40)' }}>Shift+Enter로 줄바꿈</div>
          </div>
        )}
        {hiddenCount > 0 && (
          <button
            onClick={onShowAll}
            style={{
              alignSelf: 'center', padding: '6px 16px', borderRadius: 100,
              border: 'none', background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.40)', fontSize: 13, cursor: 'pointer', flexShrink: 0,
              fontWeight: 500, minHeight: 32,
            }}
          >
            이전 메시지 {hiddenCount}개 더 보기
          </button>
        )}
        {visibleMessages.map((msg, i) => (
          <div
            key={hiddenCount + i}
            style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 14, flexShrink: 0,
              background: msg.role === 'user' ? rgba(accent, 0.15) : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: msg.role === 'user' ? accent : 'rgba(255,255,255,0.60)',
              fontWeight: 600,
            }}>
              {msg.role === 'user' ? '나' : 'AI'}
            </div>
            <div style={{
              maxWidth: '82%', padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              fontSize: 16,
              lineHeight: 1.4,
              background: msg.role === 'user' ? rgba(accent, 0.15) : 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              wordBreak: 'break-word',
            }}>
              {msg.role === 'user'
                ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                : <MarkdownMessage content={msg.content} dark={dark} />
              }
              {streaming && hiddenCount + i === messages.length - 1 && msg.role === 'assistant' && (
                <span style={{ display: 'inline-block', width: 2, height: 14, background: accent, marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom', borderRadius: 1 }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length > 0 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {dark && (
            <button
              onClick={onSave}
              style={{ fontSize: 13, color: accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', fontWeight: 500 }}
            >저장</button>
          )}
          <button
            onClick={onExport}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >내보내기</button>
          <button
            onClick={onClear}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >초기화</button>
        </div>
      )}
    </>
  )
}
