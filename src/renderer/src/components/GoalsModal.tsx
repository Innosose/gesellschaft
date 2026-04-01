import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'
import { useLocalStorage } from '../utils/hooks'
import { STORAGE_KEYS } from '../../../shared/constants'

interface Goal { id: number; title: string; target: number; current: number; unit: string; deadline?: string; createdAt: number }

let gid = 1

export default function GoalsModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [goals, setGoals] = useLocalStorage<Goal[]>(STORAGE_KEYS.goals, [])
  if (goals.length > 0 && gid <= Math.max(...goals.map(g => g.id))) gid = Math.max(...goals.map(g => g.id)) + 1
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('100')
  const [unit, setUnit] = useState('%')
  const [deadline, setDeadline] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const sorted = useMemo(() => [...goals].sort((a, b) => {
    const aP = a.current / a.target, bP = b.current / b.target
    if (aP >= 1 && bP < 1) return 1
    if (bP >= 1 && aP < 1) return -1
    return b.createdAt - a.createdAt
  }), [goals])

  const addGoal = useCallback(() => {
    if (!title.trim() || !target) return
    const goal: Goal = { id: gid++, title: title.trim(), target: Number(target), current: 0, unit, deadline: deadline || undefined, createdAt: Date.now() }
    const next = [...goals, goal]; setGoals(next)
    setTitle(''); setTarget('100'); setDeadline('')
  }, [title, target, unit, deadline, goals])

  const updateProgress = useCallback((id: number, value: number) => {
    const next = goals.map(g => g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, value)) } : g)
    setGoals(next)
  }, [goals])

  const removeGoal = useCallback((id: number) => {
    const next = goals.filter(g => g.id !== id); setGoals(next)
    if (editId === id) setEditId(null)
  }, [goals, editId])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Goals" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
        {/* Add form */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="목표 이름" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input value={target} onChange={e => setTarget(e.target.value)} type="number" placeholder="목표치" style={{ ...inputStyle, width: 70 }} />
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="단위" style={{ ...inputStyle, width: 50 }} />
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          <button onClick={addGoal} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
        </div>

        {/* Goal list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(g => {
            const pct = Math.min(100, (g.current / g.target) * 100)
            const done = pct >= 100
            const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null

            return (
              <div key={g.id} style={{
                padding: '12px 14px', borderRadius: 6,
                background: done ? rgba(T.teal, 0.04) : rgba(T.gold, 0.03),
                border: `1px solid ${done ? rgba(T.teal, 0.15) : rgba(T.gold, 0.08)}`,
                opacity: done ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: rgba(T.fg, 0.85) }}>{g.title}</span>
                  {daysLeft !== null && (
                    <span style={{ fontSize: 9, color: daysLeft < 0 ? rgba(T.danger, 0.7) : daysLeft <= 7 ? 'rgba(224,160,96,0.7)' : rgba(T.gold, 0.5) }}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : `D-${daysLeft}`}
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: done ? T.teal : rgba(T.gold, 0.7), fontFamily: 'monospace' }}>
                    {pct.toFixed(0)}%
                  </span>
                  <button onClick={() => removeGoal(g.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.4), cursor: 'pointer', fontSize: 11 }}>x</button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: rgba(T.gold, 0.08), overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${pct}%`,
                    background: done ? T.teal : pct > 60 ? T.gold : rgba(T.gold, 0.4),
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateProgress(g.id, g.current - 1)} style={{ width: 22, height: 22, borderRadius: 3, border: `1px solid ${rgba(T.gold, 0.1)}`, background: rgba(T.gold, 0.04), color: rgba(T.gold, 0.6), cursor: 'pointer', fontSize: 12 }}>-</button>
                  <span style={{ fontSize: 11, color: rgba(T.fg, 0.6), fontFamily: 'monospace' }}>
                    {g.current} / {g.target} {g.unit}
                  </span>
                  <button onClick={() => updateProgress(g.id, g.current + 1)} style={{ width: 22, height: 22, borderRadius: 3, border: `1px solid ${rgba(T.teal, 0.2)}`, background: rgba(T.teal, 0.06), color: T.teal, cursor: 'pointer', fontSize: 12 }}>+</button>
                </div>
              </div>
            )
          })}
          {goals.length === 0 && (
            <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 40 }}>
              달성하고 싶은 목표를 추가해보세요
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
