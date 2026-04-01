import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

export default function JotModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard unavailable */ }
  }, [text])

  const handlePaste = useCallback(async () => {
    try { const t = await navigator.clipboard.readText(); setText(prev => prev + t) } catch { /* */ }
  }, [])

  const charCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <Modal title="Jot" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: `1px solid ${rgba(T.gold, 0.06)}` }}>
          <button onClick={handlePaste} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.gold, 0.12)}`, background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.6), fontSize: 10, cursor: 'pointer' }}>붙여넣기</button>
          <button onClick={handleCopy} disabled={!text} title={!text ? '텍스트를 입력하세요' : undefined} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.teal, 0.2)}`, background: rgba(T.teal, 0.06), color: copied ? T.success : rgba(T.teal, 0.7), fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>{copied ? '복사됨 ✓' : '복사'}</button>
          <button onClick={() => setText('')} disabled={!text} title={!text ? '텍스트를 입력하세요' : undefined} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.danger, 0.12)}`, background: rgba(T.danger, 0.04), color: rgba(T.danger, 0.5), fontSize: 10, cursor: 'pointer' }}>지우기</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: rgba(T.gold, 0.35) }}>{charCount}자 · {wordCount}단어</span>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} autoFocus placeholder="여기에 자유롭게 적으세요. 창을 닫으면 사라집니다." spellCheck={false}
          style={{
            flex: 1, resize: 'none', padding: '16px 18px', border: 'none',
            background: 'transparent', color: rgba(T.fg, 0.85),
            fontSize: 13, lineHeight: 1.8, outline: 'none',
            fontFamily: 'inherit',
          }} />
      </div>
    </Modal>
  )
}
