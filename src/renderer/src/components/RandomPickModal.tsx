import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Mode = 'pick' | 'group' | 'order'

export default function RandomPickModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [mode, setMode] = useState<Mode>('pick')
  const [input, setInput] = useState('')
  const [count, setCount] = useState('1')
  const [groupCount, setGroupCount] = useState('2')
  const [result, setResult] = useState<string[][] | null>(null)
  const [animating, setAnimating] = useState(false)

  const getItems = useCallback((): string[] => {
    return input.split('\n').map(s => s.trim()).filter(Boolean)
  }, [input])

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const handlePick = useCallback(() => {
    const items = getItems()
    if (items.length === 0) return
    setAnimating(true)
    setTimeout(() => {
      const n = Math.min(parseInt(count) || 1, items.length)
      const picked = shuffle(items).slice(0, n)
      setResult([picked])
      setAnimating(false)
    }, 600)
  }, [getItems, count])

  const handleGroup = useCallback(() => {
    const items = getItems()
    if (items.length === 0) return
    setAnimating(true)
    setTimeout(() => {
      const gc = Math.max(2, parseInt(groupCount) || 2)
      const shuffled = shuffle(items)
      const groups: string[][] = Array.from({ length: gc }, () => [])
      shuffled.forEach((item, i) => groups[i % gc].push(item))
      setResult(groups)
      setAnimating(false)
    }, 600)
  }, [getItems, groupCount])

  const handleOrder = useCallback(() => {
    const items = getItems()
    if (items.length === 0) return
    setAnimating(true)
    setTimeout(() => {
      setResult([shuffle(items)])
      setAnimating(false)
    }, 600)
  }, [getItems])

  const handleRun = mode === 'pick' ? handlePick : mode === 'group' ? handleGroup : handleOrder

  return (
    <Modal title="랜덤 뽑기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 모드 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'pick' as Mode, label: '랜덤 뽑기' },
            { id: 'group' as Mode, label: '조 편성' },
            { id: 'order' as Mode, label: '순서 정하기' },
          ]).map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setResult(null) }} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: mode === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: mode === t.id ? T.fg : rgba(T.fg, 0.45), transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>이름/항목 (줄바꿈으로 구분)</label>
            <textarea
              className="win-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'홍길동\n김영희\n이철수\n박민수\n...'}
              style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {mode === 'pick' && (
                <>
                  <label style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>뽑기 수:</label>
                  <input className="win-input" type="number" min={1} value={count} onChange={e => setCount(e.target.value)} style={{ width: 60, textAlign: 'center' }} />
                </>
              )}
              {mode === 'group' && (
                <>
                  <label style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>조 수:</label>
                  <input className="win-input" type="number" min={2} value={groupCount} onChange={e => setGroupCount(e.target.value)} style={{ width: 60, textAlign: 'center' }} />
                </>
              )}
              <button className="win-btn-primary" onClick={handleRun} disabled={animating || getItems().length === 0} style={{ marginLeft: 'auto' }}>
                {animating ? '⟳ 추첨 중...' : mode === 'pick' ? '뽑기!' : mode === 'group' ? '조 편성!' : '순서 정하기!'}
              </button>
            </div>
          </div>

          {/* 결과 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>결과</label>
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--win-border)', borderRadius: 8, background: 'var(--win-surface-2)', padding: 12 }}>
              {!result && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>
                  {mode === 'pick' ? '🎲 뽑기 버튼을 눌러주세요' : mode === 'group' ? '👥 조 편성 버튼을 눌러주세요' : '🔢 순서 정하기를 눌러주세요'}
                </div>
              )}
              {result && mode === 'pick' && result[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 48, animation: 'popIn 0.3s ease both' }}>🎉</div>
                  {result[0].map((name, i) => (
                    <div key={i} style={{
                      fontSize: 20, fontWeight: 700, color: 'var(--win-accent)',
                      padding: '8px 24px', background: 'rgba(139,92,246,0.12)',
                      border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10,
                      animation: `popIn 0.3s ease ${i * 0.1}s both`,
                    }}>{name}</div>
                  ))}
                </div>
              )}
              {result && mode === 'group' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.map((group, gi) => (
                    <div key={gi} style={{ padding: 10, background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-accent)', marginBottom: 6 }}>{gi + 1}조 ({group.length}명)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {group.map((name, i) => (
                          <span key={i} style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                            background: rgba(T.fg, 0.08), border: `1px solid ${rgba(T.fg, 0.15)}`,
                            color: 'var(--win-text)',
                          }}>{name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result && mode === 'order' && result[0] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {result[0].map((name, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                      borderRadius: 6, background: i === 0 ? 'rgba(251,191,36,0.1)' : 'transparent',
                      border: i === 0 ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: T.fg,
                        background: i < 3 ? [T.warning, rgba(T.fg, 0.5), T.gold][i] : rgba(T.fg, 0.15),
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: 'var(--win-text)' }}>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
