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
  const inputBg = dark ? rgba(T.fg, 0.06) : rgba(T.fg, 0.06)
  const color = dark ? rgba(T.fg, 0.9) : rgba(T.fg, 0.9)
  const accent = T.teal

  return (
    <div style={{ padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))', borderTop: `0.5px solid ${rgba(T.fg, 0.08)}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지 입력..."
          rows={2}
          style={{
            flex: 1, resize: 'none', padding: '10px 14px', fontSize: 17,
            borderRadius: 18, border: 'none',
            background: inputBg, color,
            outline: 'none', lineHeight: 1.4, fontFamily: 'inherit',
            letterSpacing: '-0.02em',
          }}
        />
        {streaming ? (
          <button
            onClick={onCancel}
            style={{
              height: 36, width: 36, borderRadius: 18, border: 'none', cursor: 'pointer',
              background: rgba(T.danger, 0.15), color: T.danger, fontSize: 14, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            aria-label="스트리밍 중단"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim()}
            style={{
              height: 36, width: 36, borderRadius: 18, border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? accent : rgba(T.fg, 0.06),
              color: input.trim() ? '#fff' : rgba(T.fg, 0.25),
              fontSize: 16, flexShrink: 0,
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="메시지 전송"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 12V4M4 7l4-4 4 4"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
