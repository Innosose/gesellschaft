import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface CharGroup { label: string; chars: string[] }

const GROUPS: CharGroup[] = [
  { label: '화살표', chars: ['←','→','↑','↓','↔','↕','⇐','⇒','⇑','⇓','⇔','⇕','↗','↘','↙','↖','➜','➤','▶','◀','▲','▼'] },
  { label: '수학', chars: ['±','×','÷','≠','≈','≤','≥','∞','∑','∏','√','∫','∂','∆','∇','∈','∉','⊂','⊃','∪','∩','∅','∝','∟','∠','π','θ','α','β','γ','δ','ε','λ','μ','σ','ω'] },
  { label: '기호', chars: ['©','®','™','§','¶','†','‡','•','·','…','‰','°','′','″','¢','£','¥','€','₩','¤','♠','♣','♥','♦','♩','♪','♫','♬'] },
  { label: '도형', chars: ['■','□','▪','▫','●','○','◆','◇','★','☆','▣','◈','△','▽','◁','▷','♤','♧','♡','♢','⬛','⬜','🔲','🔳'] },
  { label: '체크/표시', chars: ['✓','✔','✕','✖','✗','✘','◯','⊙','⊕','⊖','⊗','☐','☑','☒'] },
  { label: '괄호', chars: ['「','」','『','』','【','】','〔','〕','〈','〉','《','》','〖','〗','⟨','⟩','⟪','⟫'] },
  { label: '선/테두리', chars: ['─','│','┌','┐','└','┘','├','┤','┬','┴','┼','═','║','╔','╗','╚','╝','╠','╣','╦','╩','╬'] },
  { label: '이모지', chars: ['😀','😂','🤔','👍','👎','❤️','🔥','⭐','💡','📌','📎','✏️','📝','🔍','⚡','🎯','💬','📁','🗂️','⚙️','🔒','🔑','📊','📈'] },
]

export default function TypeModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [activeGroup, setActiveGroup] = useState(0)
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gs-type-recent') ?? '[]') } catch { return [] }
  })
  const [copied, setCopied] = useState('')
  const [search, setSearch] = useState('')

  const handleClick = useCallback(async (char: string) => {
    try { await navigator.clipboard.writeText(char) } catch { /* clipboard unavailable */ }
    setCopied(char); setTimeout(() => setCopied(''), 800)
    setRecent(prev => {
      const next = [char, ...prev.filter(c => c !== char)].slice(0, 20)
      localStorage.setItem('gs-type-recent', JSON.stringify(next))
      return next
    })
  }, [])

  const allChars = search
    ? GROUPS.flatMap(g => g.chars).filter(c => c.includes(search))
    : GROUPS[activeGroup]?.chars ?? []

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Type" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${rgba(T.gold, 0.06)}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="문자 검색..." style={{ ...inputStyle, width: 140 }} />
          <span style={{ fontSize: 9, color: rgba(T.gold, 0.4) }}>클릭하면 복사됩니다</span>
          {copied && <span style={{ fontSize: 10, color: T.teal, marginLeft: 'auto' }}>'{copied}' 복사됨</span>}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Category tabs */}
          {!search && (
            <div style={{ width: 100, flexShrink: 0, padding: '8px 6px', borderRight: `1px solid ${rgba(T.gold, 0.06)}`, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
              {recent.length > 0 && (
                <button onClick={() => setActiveGroup(-1)} style={{
                  padding: '5px 6px', borderRadius: 3, textAlign: 'left', fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${activeGroup === -1 ? rgba(T.teal, 0.25) : 'transparent'}`,
                  background: activeGroup === -1 ? rgba(T.teal, 0.06) : 'transparent',
                  color: activeGroup === -1 ? T.teal : rgba(T.fg, 0.5),
                }}>최근 사용</button>
              )}
              {GROUPS.map((g, i) => (
                <button key={g.label} onClick={() => setActiveGroup(i)} style={{
                  padding: '5px 6px', borderRadius: 3, textAlign: 'left', fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${activeGroup === i ? rgba(T.teal, 0.25) : 'transparent'}`,
                  background: activeGroup === i ? rgba(T.teal, 0.06) : 'transparent',
                  color: activeGroup === i ? T.teal : rgba(T.fg, 0.5),
                }}>{g.label}</button>
              ))}
            </div>
          )}

          {/* Characters grid */}
          <div style={{ flex: 1, padding: 12, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(activeGroup === -1 ? recent : allChars).map((char, i) => (
                <button key={`${char}-${i}`} onClick={() => handleClick(char)} title={`U+${char.codePointAt(0)?.toString(16).toUpperCase()}`} style={{
                  width: 36, height: 36, borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${copied === char ? rgba(T.teal, 0.3) : rgba(T.gold, 0.08)}`,
                  background: copied === char ? rgba(T.teal, 0.08) : rgba(T.gold, 0.03),
                  color: rgba(T.fg, 0.8), fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s ease',
                }}>{char}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
