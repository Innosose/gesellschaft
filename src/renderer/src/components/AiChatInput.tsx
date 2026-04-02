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
  const inputBg = dark ? rgba(T.fg, 0.06)    : 'var(--win-surface)'
  const color = dark ? rgba(T.fg, 0.85)       : 'var(--win-text)'
  const accent = dark ? T.teal        : 'var(--win-accent)'
  const mutedColor = dark ? rgba(T.fg, 0.35)  : 'var(--win-text-muted)'

  return (
    <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', borderTop: `1px solid ${rgba(T.fg, 0.06)}`, background: bg, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지 입력... (Enter로 전송)"
          rows={2}
          style={{
            flex: 1, resize: 'none', padding: '12px 16px', fontSize: 15,
            borderRadius: 20, border: 'none',
            background: inputBg, color,
            outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
          }}
        />
        {streaming ? (
          <button
            onClick={onCancel}
            style={{
              height: 44, width: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
              background: T.danger, color: '#fff', fontSize: 16, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="스트리밍 중단"
          >⏹</button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim()}
            style={{
              height: 44, width: 44, borderRadius: 22, border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? accent : (dark ? rgba(T.fg, 0.06) : 'var(--win-surface)'),
              color: input.trim() ? '#fff' : mutedColor,
              fontSize: 18, flexShrink: 0,
              transition: 'background 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="메시지 전송"
          >↑</button>
        )}
      </div>
    </div>
  )
}
