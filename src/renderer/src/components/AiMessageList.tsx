import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../../../shared/types'

// ── Code block with copy button ────────────────────────────────────────────
function CodeBlock({ code }: { code: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false)
  return (
    <div style={{ position: 'relative', margin: '6px 0' }}>
      <pre style={{ margin: 0, padding: '10px 12px', borderRadius: 6, overflowX: 'auto', fontSize: 11, lineHeight: 1.6, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <code style={{ fontFamily: 'ui-monospace, monospace' }}>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: copied ? '#1e7e34' : 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
      >{copied ? '✓' : '복사'}</button>
    </div>
  )
}

// ── Memoized markdown renderer ─────────────────────────────────────────────
export const MarkdownMessage = memo(function MarkdownMessage({ content, dark }: { content: string; dark?: boolean }): React.ReactElement {
  const textColor  = dark ? 'rgba(255,255,255,0.85)' : 'var(--win-text)'
  const mutedColor = dark ? 'rgba(255,255,255,0.5)'  : 'var(--win-text-muted)'
  return (
    <ReactMarkdown
      components={{
        p:          ({ children }) => <p style={{ margin: '2px 0', lineHeight: 1.6, color: textColor }}>{children}</p>,
        strong:     ({ children }) => <strong style={{ fontWeight: 700, color: textColor }}>{children}</strong>,
        em:         ({ children }) => <em style={{ color: mutedColor }}>{children}</em>,
        ul:         ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 18, color: textColor }}>{children}</ul>,
        ol:         ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 18, color: textColor }}>{children}</ol>,
        li:         ({ children }) => <li style={{ margin: '1px 0', lineHeight: 1.6 }}>{children}</li>,
        h1:         ({ children }) => <h1 style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: textColor }}>{children}</h1>,
        h2:         ({ children }) => <h2 style={{ fontSize: 13, fontWeight: 700, margin: '5px 0 2px', color: textColor }}>{children}</h2>,
        h3:         ({ children }) => <h3 style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 2px', color: textColor }}>{children}</h3>,
        code:       ({ children, className }) => {
          const isBlock = className?.startsWith('language-') || (typeof children === 'string' && (children as string).includes('\n'))
          if (isBlock) return <CodeBlock code={String(children).trimEnd()} />
          return <code style={{ fontSize: 11, padding: '1px 4px', borderRadius: 3, background: dark ? 'rgba(255,255,255,0.12)' : 'var(--win-surface-3)', fontFamily: 'ui-monospace, monospace', color: textColor }}>{children}</code>
        },
        pre:        ({ children }) => <>{children}</>,
        blockquote: ({ children }) => <blockquote style={{ margin: '4px 0', paddingLeft: 10, borderLeft: '3px solid rgba(139,92,246,0.5)', color: mutedColor }}>{children}</blockquote>,
        hr:         () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '6px 0' }} />,
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
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--win-border)'
  const userBg     = dark ? 'rgba(139,92,246,0.25)' : 'var(--win-accent-dim)'
  const userBorder = dark ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--win-border)'
  const assistBg   = dark ? 'rgba(255,255,255,0.05)' : 'var(--win-surface-2)'
  const avatarUserBg = dark ? 'rgba(139,92,246,0.4)' : 'var(--win-accent)'
  const avatarAsstBg = dark ? 'rgba(255,255,255,0.08)' : 'var(--win-surface-2)'
  const textColor  = dark ? 'rgba(255,255,255,0.85)' : 'var(--win-text)'
  const mutedColor = dark ? 'rgba(255,255,255,0.62)' : 'var(--win-text-muted)'
  const cursorBg   = dark ? 'rgba(139,92,246,0.8)' : 'var(--win-accent)'
  const foldBorder = dark ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--win-border)'
  const foldBg     = dark ? 'rgba(139,92,246,0.08)'          : 'var(--win-surface-2)'
  const foldColor  = dark ? 'rgba(196,181,253,0.8)'          : 'var(--win-text-sub)'
  const btnColor   = dark ? 'rgba(255,255,255,0.58)' : 'var(--win-text-muted)'
  const saveColor  = dark ? 'rgba(139,92,246,0.9)'   : 'var(--win-accent)'

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: mutedColor, fontSize: 12, marginTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
            <div>무엇이든 질문해보세요</div>
            <div style={{ marginTop: 6, fontSize: 11 }}>Shift+Enter로 줄바꿈</div>
          </div>
        )}
        {hiddenCount > 0 && (
          <button
            onClick={onShowAll}
            style={{
              alignSelf: 'center', padding: '5px 14px', borderRadius: 14,
              border: foldBorder, background: foldBg,
              color: foldColor, fontSize: 11, cursor: 'pointer', flexShrink: 0,
            }}
          >
            ⬆ 이전 메시지 {hiddenCount}개 더 보기
          </button>
        )}
        {visibleMessages.map((msg, i) => (
          <div
            key={hiddenCount + i}
            style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? avatarUserBg : avatarAsstBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, border,
            }}>
              {msg.role === 'user' ? '나' : '🤖'}
            </div>
            <div style={{
              maxWidth: '82%', padding: '8px 12px', borderRadius: 8, fontSize: 12,
              lineHeight: 1.6,
              background: msg.role === 'user' ? userBg : assistBg,
              color: textColor,
              border: msg.role === 'user' ? userBorder : border,
              wordBreak: 'break-word',
            }}>
              {msg.role === 'user'
                ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                : <MarkdownMessage content={msg.content} dark={dark} />
              }
              {streaming && hiddenCount + i === messages.length - 1 && msg.role === 'assistant' && (
                <span style={{ display: 'inline-block', width: 6, height: 12, background: cursorBg, marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length > 0 && (
        <div style={{ padding: '0 14px 6px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {dark && (
            <button
              onClick={onSave}
              style={{ fontSize: 11, color: saveColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
            >💾 저장</button>
          )}
          <button
            onClick={onExport}
            style={{ fontSize: 11, color: btnColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >↓ 내보내기</button>
          <button
            onClick={onClear}
            style={{ fontSize: 11, color: btnColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >{dark ? '초기화' : '대화 초기화'}</button>
        </div>
      )}
    </>
  )
}
