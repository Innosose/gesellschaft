import React from 'react'
import { T, rgba } from '../utils/theme'

interface AiChatInputProps {
  input: string
  setInput: (s: string) => void
  streaming: boolean
  onSend: () => void
  onCancel: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  /** true = 어두운 오버레이 배경, false = win CSS 변수 배경 */
  dark?: boolean
}

export default function AiChatInput({
  input, setInput, streaming, onSend, onCancel, onKeyDown, inputRef, dark = false,
}: AiChatInputProps): React.ReactElement {
  const bg    = dark ? rgba(T.bg, 0.9)                : 'var(--win-surface-2)'
  const border = dark ? `1px solid ${rgba(T.fg, 0.08)}` : '1px solid var(--win-border)'
  const inputBg = dark ? rgba(T.fg, 0.05)    : 'var(--win-surface)'
  const color = dark ? rgba(T.fg, 0.85)       : 'var(--win-text)'
  const accent = dark ? rgba(T.gold, 0.8)        : 'var(--win-accent)'
  const mutedColor = dark ? rgba(T.fg, 0.48)  : 'var(--win-text-muted)'

  return (
    <div style={{ padding: '10px 14px 14px', borderTop: border, background: bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지 입력... (Enter로 전송)"
          rows={2}
          style={{
            flex: 1, resize: 'none', padding: '8px 10px', fontSize: 12,
            borderRadius: 6, border,
            background: inputBg, color,
            outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
          }}
        />
        {streaming ? (
          <button
            onClick={onCancel}
            style={{
              height: 54, width: 50, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: T.danger, color: T.fg, fontSize: 18, flexShrink: 0,
            }}
            aria-label="스트리밍 중단"
          >⏹</button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim()}
            style={{
              height: 54, width: 50, borderRadius: 6, border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? accent : (dark ? rgba(T.fg, 0.05) : 'var(--win-surface)'),
              color: input.trim() ? T.fg : mutedColor,
              fontSize: 18, flexShrink: 0,
              transition: 'background 0.12s ease',
            }}
            aria-label="메시지 전송"
          >↑</button>
        )}
      </div>
    </div>
  )
}
