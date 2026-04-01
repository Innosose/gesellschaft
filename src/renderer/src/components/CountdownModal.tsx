import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

interface Countdown { id: number; name: string; target: string; color: string }

const STORAGE_KEY = 'gs-countdowns'
const COLORS = [T.teal, T.danger, T.success, T.warning, T.gold, T.warning, T.teal, T.danger]
let nextId = 1

function load(): Countdown[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Countdown[]
    nextId = Math.max(...items.map(c => c.id), 0) + 1
    return items
  } catch { return [] }
}

function calcRemaining(target: string) {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, total: 0 }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { days, hours, minutes, seconds, expired: false, total: diff }
}

export default function CountdownModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [items, setItems] = useState<Countdown[]>(load)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [, setTick] = useState(0)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }, [items])
  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 1000); return () => clearInterval(t) }, [])

  const add = useCallback(() => {
    if (!name.trim() || !target) return
    setItems(prev => [...prev, { id: nextId++, name: name.trim(), target, color: COLORS[Math.floor(Math.random() * COLORS.length)] }])
    setName(''); setTarget('')
  }, [name, target])

  const remove = useCallback((id: number) => { setItems(prev => prev.filter(c => c.id !== id)) }, [])

  return (
    <Modal title="카운트다운" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Add form */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>이름</label>
            <input className="win-input" value={name} onChange={e => setName(e.target.value)} placeholder="시험, 생일..." style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>목표 날짜</label>
            <input className="win-input" type="datetime-local" value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%' }} />
          </div>
          <button className="win-btn-primary" onClick={add} style={{ fontSize: 12, height: 34 }}>추가</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>카운트다운을 추가하세요</div>}
          {items.map(item => {
            const rem = calcRemaining(item.target)
            return (
              <div key={item.id} style={{
                padding: 16, borderRadius: 12, border: `1px solid ${item.color}33`,
                background: `linear-gradient(135deg, ${item.color}10, transparent)`, position: 'relative',
              }}>
                <button onClick={() => remove(item.id)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 14 }}>x</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)', marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 10 }}>
                  {new Date(item.target).toLocaleString('ko-KR')}
                </div>
                {rem.expired ? (
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color, textAlign: 'center' }}>완료!</div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {[
                      { v: rem.days, l: '일' },
                      { v: rem.hours, l: '시간' },
                      { v: rem.minutes, l: '분' },
                      { v: rem.seconds, l: '초' },
                    ].map(({ v, l }) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 24, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums',
                          minWidth: 44, padding: '4px 8px', borderRadius: 8, background: `${item.color}15`,
                        }}>{String(v).padStart(2, '0')}</div>
                        <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
