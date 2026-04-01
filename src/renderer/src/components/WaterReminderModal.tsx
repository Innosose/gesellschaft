import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface DayRecord {
  date: string
  glasses: number
}

const STORAGE_KEY = 'gs-water'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function loadData(): { goal: number; records: DayRecord[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { goal: 8, records: [] }
    return JSON.parse(raw)
  } catch { return { goal: 8, records: [] } }
}

function saveData(goal: number, records: DayRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ goal, records }))
}

export default function WaterReminderModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const initial = loadData()
  const [goal, setGoal] = useState(initial.goal)
  const [records, setRecords] = useState<DayRecord[]>(initial.records)

  const today = todayStr()

  useEffect(() => { saveData(goal, records) }, [goal, records])

  const todayRecord = useMemo(() => records.find(r => r.date === today), [records, today])
  const todayGlasses = todayRecord?.glasses || 0
  const pct = Math.min(Math.round((todayGlasses / goal) * 100), 100)

  const addGlass = (): void => {
    setRecords(prev => {
      const existing = prev.find(r => r.date === today)
      if (existing) {
        return prev.map(r => r.date === today ? { ...r, glasses: r.glasses + 1 } : r)
      }
      return [...prev, { date: today, glasses: 1 }]
    })
  }

  const removeGlass = (): void => {
    setRecords(prev => prev.map(r => r.date === today ? { ...r, glasses: Math.max(0, r.glasses - 1) } : r))
  }

  // Last 7 days
  const weekData = useMemo(() => {
    const days: { date: string; glasses: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i)
      const rec = records.find(r => r.date === d)
      days.push({ date: d, glasses: rec?.glasses || 0 })
    }
    return days
  }, [records, today])

  const weekAvg = useMemo(() => {
    const total = weekData.reduce((s, d) => s + d.glasses, 0)
    return (total / 7).toFixed(1)
  }, [weekData])

  return (
    <Modal title="물 마시기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', alignItems: 'center' }}>
        {/* 목표 설정 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>일일 목표:</span>
          <button className="win-btn-ghost" onClick={() => setGoal(prev => Math.max(1, prev - 1))} style={{ padding: '2px 8px' }}>-</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.teal, minWidth: 30, textAlign: 'center' }}>{goal}</span>
          <button className="win-btn-ghost" onClick={() => setGoal(prev => prev + 1)} style={{ padding: '2px 8px' }}>+</button>
          <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>잔</span>
        </div>

        {/* 물 채우기 시각화 */}
        <div style={{ position: 'relative', width: 140, height: 180, borderRadius: '0 0 30px 30px', border: `3px solid ${rgba(T.teal, 0.4)}`, borderTop: 'none', overflow: 'hidden', background: rgba(T.bg, 0.2) }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${rgba(T.teal, 0.6)}, ${rgba(T.teal, 0.8)})`,
            transition: 'height 0.5s ease',
            borderRadius: '0 0 27px 27px',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: T.fg, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{todayGlasses}</span>
            <span style={{ fontSize: 12, color: rgba(T.fg, 0.7) }}>/ {goal}잔</span>
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="win-btn-ghost" onClick={removeGlass} style={{ fontSize: 20, width: 44, height: 44, borderRadius: '50%' }}>-</button>
          <button className="win-btn-primary" onClick={addGlass} style={{ fontSize: 16, padding: '8px 24px', borderRadius: 20 }}>
            + 한 잔 마시기
          </button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: pct >= 100 ? T.success : 'var(--win-text-sub)' }}>
          {pct >= 100 ? '목표 달성!' : `${pct}% 달성`}
        </div>

        {/* 주간 기록 */}
        <div style={{ width: '100%', padding: '12px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 8 }}>최근 7일 (평균 {weekAvg}잔/일)</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {weekData.map(d => {
              const h = goal > 0 ? Math.min((d.glasses / goal) * 100, 100) : 0
              const isToday = d.date === today
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{d.glasses}</span>
                  <div style={{ width: '100%', height: 60, background: rgba(T.fg, 0.05), borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: isToday ? T.gold : rgba(T.teal, 0.4), borderRadius: 4, transition: 'height 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? T.teal : 'var(--win-text-muted)' }}>{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
