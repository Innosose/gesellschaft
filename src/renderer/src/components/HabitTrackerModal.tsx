import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Habit {
  id: number
  name: string
  color: string
  checks: Record<string, boolean> // date -> done
}

const STORAGE_KEY = 'gs-habits'
const COLORS = [T.gold, T.success, T.warning, T.danger, rgba(T.danger, 0.7), T.teal, rgba(T.warning, 0.8), T.gold]
let nextId = 1

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Habit[]
    nextId = Math.max(...items.map(h => h.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: Habit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function HabitTrackerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [habits, setHabits] = useState<Habit[]>(load)
  const [name, setName] = useState('')
  const [selColor, setSelColor] = useState(COLORS[0])

  useEffect(() => { save(habits) }, [habits])

  const today = todayStr()

  const addHabit = (): void => {
    if (!name.trim()) return
    setHabits(prev => [...prev, { id: nextId++, name: name.trim(), color: selColor, checks: {} }])
    setName('')
  }

  const toggleCheck = (id: number, date: string): void => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      const checks = { ...h.checks }
      checks[date] = !checks[date]
      if (!checks[date]) delete checks[date]
      return { ...h, checks }
    }))
  }

  const remove = (id: number): void => {
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  // Grid: last 28 days (4 weeks)
  const gridDays = useMemo(() => {
    const days: string[] = []
    for (let i = 27; i >= 0; i--) days.push(addDays(today, -i))
    return days
  }, [today])

  // Week days for current week
  const weekDays = useMemo(() => {
    const d = new Date(today)
    const dayOfWeek = d.getDay()
    const days: string[] = []
    for (let i = 0; i < 7; i++) days.push(addDays(today, i - dayOfWeek))
    return days
  }, [today])

  const getStreak = (h: Habit): number => {
    let streak = 0
    let d = today
    while (h.checks[d]) {
      streak++
      d = addDays(d, -1)
    }
    return streak
  }

  const getWeekRate = (h: Habit): number => {
    const done = weekDays.filter(d => h.checks[d]).length
    return Math.round((done / 7) * 100)
  }

  return (
    <Modal title="습관 트래커" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="win-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} placeholder="새 습관 추가" style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 3 }}>
            {COLORS.map(c => (
              <span key={c} onClick={() => setSelColor(c)} style={{
                width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer',
                border: selColor === c ? '2px solid #fff' : '2px solid transparent',
              }} />
            ))}
          </div>
          <button className="win-btn-primary" onClick={addHabit} style={{ fontSize: 12 }}>추가</button>
        </div>

        {/* 습관 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {habits.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>습관을 추가하세요</div>}
          {habits.map(h => {
            const streak = getStreak(h)
            const weekRate = getWeekRate(h)
            return (
              <div key={h.id} style={{ padding: '12px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: h.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{h.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: T.warning }}>{streak}일 연속</span>
                    <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>이번주 {weekRate}%</span>
                    <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(h.id)}>×</button>
                  </div>
                </div>
                {/* GitHub-style grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(28, 1fr)', gap: 2 }}>
                  {gridDays.map(day => {
                    const checked = !!h.checks[day]
                    const isToday = day === today
                    return (
                      <span
                        key={day}
                        onClick={() => toggleCheck(h.id, day)}
                        title={`${day}${checked ? ' ✓' : ''}`}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 2, cursor: 'pointer',
                          background: checked ? h.color : rgba(T.fg, 0.06),
                          opacity: checked ? 1 : 0.4,
                          border: isToday ? `1px solid ${rgba(T.fg, 0.4)}` : '1px solid transparent',
                        }}
                      />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{gridDays[0]}</span>
                  <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>오늘</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
