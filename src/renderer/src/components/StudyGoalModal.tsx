import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Milestone {
  text: string
  done: boolean
}

interface Goal {
  id: number
  title: string
  type: 'weekly' | 'monthly'
  startDate: string
  milestones: Milestone[]
}

const STORAGE_KEY = 'gs-study-goals'
let nextId = 1

function load(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Goal[]
    nextId = Math.max(...items.map(g => g.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: Goal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function getWeekStr(d: Date): string {
  const start = new Date(d)
  start.setDate(start.getDate() - start.getDay())
  return start.toISOString().slice(0, 10)
}

export default function StudyGoalModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [goals, setGoals] = useState<Goal[]>(load)
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly')
  const [title, setTitle] = useState('')
  const [milestoneText, setMilestoneText] = useState('')
  const [milestones, setMilestones] = useState<string[]>([])

  useEffect(() => { save(goals) }, [goals])

  const filtered = useMemo(() => goals.filter(g => g.type === tab).sort((a, b) => b.startDate.localeCompare(a.startDate)), [goals, tab])

  const addMilestone = (): void => {
    if (!milestoneText.trim()) return
    setMilestones(prev => [...prev, milestoneText.trim()])
    setMilestoneText('')
  }

  const addGoal = (): void => {
    if (!title.trim()) return
    const now = new Date()
    const startDate = tab === 'weekly' ? getWeekStr(now) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    setGoals(prev => [...prev, { id: nextId++, title: title.trim(), type: tab, startDate, milestones: milestones.map(t => ({ text: t, done: false })) }])
    setTitle(''); setMilestones([]); setMilestoneText('')
  }

  const toggleMilestone = (goalId: number, idx: number): void => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const ms = [...g.milestones]
      ms[idx] = { ...ms[idx], done: !ms[idx].done }
      return { ...g, milestones: ms }
    }))
  }

  const remove = (id: number): void => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  return (
    <Modal title="학습 목표 설정" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'weekly' as const, label: '주간 목표' }, { id: 'monthly' as const, label: '월간 목표' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={`${tab === 'weekly' ? '주간' : '월간'} 목표 제목`} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={milestoneText} onChange={e => setMilestoneText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMilestone()} placeholder="세부 목표 추가 (Enter)" style={{ flex: 1 }} />
            <button className="win-btn-ghost" onClick={addMilestone} style={{ fontSize: 12 }}>+</button>
          </div>
          {milestones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--win-text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>☐</span><span>{m}</span>
                  <button onClick={() => setMilestones(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 10 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <button className="win-btn-primary" onClick={addGoal} style={{ alignSelf: 'flex-start', fontSize: 12 }}>목표 추가</button>
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>목표를 추가하세요</div>}
          {filtered.map(g => {
            const done = g.milestones.filter(m => m.done).length
            const total = g.milestones.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div key={g.id} style={{ padding: '12px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--win-text)' }}>{g.title}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? T.success : T.gold }}>{pct}%</span>
                    <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(g.id)}>×</button>
                  </div>
                </div>
                {total > 0 && (
                  <>
                    <div style={{ height: 5, background: rgba(T.fg, 0.08), borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? T.success : T.gold, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {g.milestones.map((m, i) => (
                        <div key={i} onClick={() => toggleMilestone(g.id, i)} style={{ fontSize: 12, color: m.done ? 'var(--win-text-muted)' : 'var(--win-text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textDecoration: m.done ? 'line-through' : 'none' }}>
                          <span>{m.done ? '☑' : '☐'}</span><span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 6 }}>{g.startDate} ~</div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
