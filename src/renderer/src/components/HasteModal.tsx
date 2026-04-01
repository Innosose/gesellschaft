import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Action = 'trim' | 'dedup' | 'sort' | 'sortDesc' | 'number' | 'unwrap' | 'blank' | 'reverse' | 'lower' | 'upper'

const ACTIONS: { id: Action; label: string; desc: string }[] = [
  { id: 'trim', label: '공백 정리', desc: '앞뒤 공백 및 연속 공백 제거' },
  { id: 'dedup', label: '중복 제거', desc: '동일한 줄 제거' },
  { id: 'sort', label: '정렬 (오름)', desc: '가나다/ABC 순 정렬' },
  { id: 'sortDesc', label: '정렬 (내림)', desc: '역순 정렬' },
  { id: 'number', label: '번호 매기기', desc: '각 줄 앞에 번호 추가' },
  { id: 'unwrap', label: '줄바꿈 제거', desc: '한 줄로 합치기' },
  { id: 'blank', label: '빈줄 제거', desc: '비어있는 줄 모두 삭제' },
  { id: 'reverse', label: '순서 뒤집기', desc: '줄 순서를 반대로' },
  { id: 'lower', label: '소문자', desc: '모든 텍스트를 소문자로' },
  { id: 'upper', label: '대문자', desc: '모든 텍스트를 대문자로' },
]

function apply(text: string, action: Action): string {
  const lines = text.split('\n')
  switch (action) {
    case 'trim': return lines.map(l => l.trim().replace(/\s+/g, ' ')).join('\n')
    case 'dedup': return [...new Set(lines)].join('\n')
    case 'sort': return [...lines].sort((a, b) => a.localeCompare(b)).join('\n')
    case 'sortDesc': return [...lines].sort((a, b) => b.localeCompare(a)).join('\n')
    case 'number': return lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
    case 'unwrap': return lines.join(' ').replace(/\s+/g, ' ').trim()
    case 'blank': return lines.filter(l => l.trim()).join('\n')
    case 'reverse': return [...lines].reverse().join('\n')
    case 'lower': return text.toLowerCase()
    case 'upper': return text.toUpperCase()
  }
}

export default function HasteModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleAction = useCallback((action: Action) => {
    setText(prev => apply(prev, action))
  }, [])

  const handlePaste = useCallback(async () => {
    try { setText(await navigator.clipboard.readText()) } catch { /* no permission */ }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard unavailable */ }
  }, [text])

  const lineCount = text ? text.split('\n').length : 0
  const charCount = text.length

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Haste" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Actions */}
        <div style={{ width: 160, flexShrink: 0, padding: '12px 10px', borderRight: `1px solid ${rgba(T.gold, 0.06)}`, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
          {ACTIONS.map(a => (
            <button key={a.id} onClick={() => handleAction(a.id)} title={a.desc} style={{
              padding: '6px 8px', borderRadius: 3, textAlign: 'left', cursor: 'pointer',
              border: `1px solid ${rgba(T.gold, 0.06)}`, background: rgba(T.gold, 0.03),
              color: rgba(T.fg, 0.7), fontSize: 11,
              transition: 'all 0.1s ease',
            }} className="hub-sat-btn">{a.label}</button>
          ))}
        </div>

        {/* Text area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${rgba(T.gold, 0.06)}` }}>
            <button onClick={handlePaste} style={{ ...inputStyle, cursor: 'pointer', fontSize: 10 }}>붙여넣기</button>
            <button onClick={handleCopy} disabled={!text} style={{ ...inputStyle, cursor: 'pointer', fontSize: 10, color: copied ? T.teal : undefined }}>{copied ? '복사됨' : '복사'}</button>
            <button onClick={() => setText('')} disabled={!text} style={{ ...inputStyle, cursor: 'pointer', fontSize: 10 }}>지우기</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: rgba(T.gold, 0.4) }}>{lineCount}줄 · {charCount}자</span>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="텍스트를 입력하거나 붙여넣기..." spellCheck={false}
            style={{ flex: 1, resize: 'none', padding: 12, border: 'none', background: 'transparent', color: rgba(T.fg, 0.85), fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, outline: 'none' }} />
        </div>
      </div>
    </Modal>
  )
}
