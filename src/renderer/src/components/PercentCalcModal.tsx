import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'
import { useCopyFeedback } from '../utils/hooks'

type Mode = 'whatPct' | 'pctOf' | 'pctChange'

export default function PercentCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [mode, setMode] = useState<Mode>('whatPct')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [copied, doCopy] = useCopyFeedback()

  const result = useMemo(() => {
    const va = parseFloat(a), vb = parseFloat(b)
    if (isNaN(va) || isNaN(vb)) return null
    switch (mode) {
      case 'whatPct': return vb === 0 ? null : { value: (va / vb) * 100, desc: `${va}은(는) ${vb}의 ${((va / vb) * 100).toFixed(4)}%` }
      case 'pctOf': return { value: (va / 100) * vb, desc: `${va}%의 ${vb} = ${((va / 100) * vb).toFixed(4)}` }
      case 'pctChange': return vb === 0 ? null : { value: ((va - vb) / Math.abs(vb)) * 100, desc: `${vb}에서 ${va}(으)로 ${(((va - vb) / Math.abs(vb)) * 100).toFixed(4)}% 변화` }
    }
  }, [mode, a, b])

  const copy = () => { if (result) doCopy(result.desc) }

  const modes: { id: Mode; label: string; labelA: string; labelB: string; question: string }[] = [
    { id: 'whatPct', label: 'X는 Y의 몇 %?', labelA: 'X (부분)', labelB: 'Y (전체)', question: 'X는 Y의 몇 퍼센트인가?' },
    { id: 'pctOf', label: 'X%의 Y는?', labelA: 'X (퍼센트)', labelB: 'Y (값)', question: 'X%의 Y는 얼마인가?' },
    { id: 'pctChange', label: '% 변화율', labelA: '새 값', labelB: '기존 값', question: '기존에서 새 값으로의 변화율은?' },
  ]

  const current = modes.find(m => m.id === mode)!

  return (
    <Modal title="비율 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* mode tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setA(''); setB('') }} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: mode === m.id ? rgba(T.fg, 0.12) : 'transparent',
              color: mode === m.id ? T.fg : rgba(T.fg, 0.45),
            }}>{m.label}</button>
          ))}
        </div>

        <div style={{ fontSize: 13, color: 'var(--win-text-sub)', fontWeight: 500 }}>{current.question}</div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>{current.labelA}</label>
            <input className="win-input" type="number" value={a} onChange={e => setA(e.target.value)} placeholder="값 입력" style={{ width: '100%', fontSize: 18, textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>{current.labelB}</label>
            <input className="win-input" type="number" value={b} onChange={e => setB(e.target.value)} placeholder="값 입력" style={{ width: '100%', fontSize: 18, textAlign: 'center' }} />
          </div>
        </div>

        {/* result */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {result ? (
            <div style={{ textAlign: 'center', padding: 24, background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)', minWidth: 250 }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: T.teal, fontFamily: 'monospace', marginBottom: 8 }}>
                {result.value.toFixed(2)}{mode !== 'pctOf' ? '%' : ''}
              </div>
              <div style={{ fontSize: 13, color: 'var(--win-text-muted)', marginBottom: 12 }}>{result.desc}</div>
              <button className="win-btn-ghost" onClick={copy} style={{ fontSize: 11 }}>
                {copied ? '복사됨!' : '결과 복사'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>값을 입력하면 즉시 계산됩니다</div>
          )}
        </div>

        {/* quick reference */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[10, 15, 20, 25, 30, 50, 75].map(p => (
            <span key={p} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: T.teal, cursor: 'pointer' }}
              onClick={() => { setMode('pctOf'); setA(String(p)) }}>
              {p}%
            </span>
          ))}
        </div>
      </div>
    </Modal>
  )
}
