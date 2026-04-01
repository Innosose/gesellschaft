import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface ExerciseEntry {
  id: number
  date: string
  type: string
  duration: number // minutes
  sets: string
  reps: string
  calories: number
  memo: string
}

const STORAGE_KEY = 'gs-exercise'
const EXERCISE_TYPES = ['달리기', '걷기', '자전거', '수영', '웨이트', '요가', '스트레칭', '줄넘기', '기타']
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

function load(): ExerciseEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as ExerciseEntry[]
    nextId = Math.max(...items.map(e => e.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: ExerciseEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function ExerciseLogModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [entries, setEntries] = useState<ExerciseEntry[]>(load)
  const [date, setDate] = useState(todayStr())
  const [type, setType] = useState(EXERCISE_TYPES[0])
  const [duration, setDuration] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [calories, setCalories] = useState('')
  const [memo, setMemo] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const addEntry = (): void => {
    if (!duration && !sets) return
    setEntries(prev => [...prev, {
      id: nextId++, date, type, duration: parseInt(duration) || 0,
      sets: sets.trim(), reps: reps.trim(), calories: parseInt(calories) || 0, memo: memo.trim(),
    }])
    setDuration(''); setSets(''); setReps(''); setCalories(''); setMemo('')
  }

  const remove = (id: number): void => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const todayEntries = useMemo(() => entries.filter(e => e.date === date), [entries, date])
  const todayTotal = useMemo(() => ({
    duration: todayEntries.reduce((s, e) => s + e.duration, 0),
    calories: todayEntries.reduce((s, e) => s + e.calories, 0),
  }), [todayEntries])

  // Weekly summary
  const weekData = useMemo(() => {
    const days: { date: string; duration: number; calories: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(todayStr(), -i)
      const dayEntries = entries.filter(e => e.date === d)
      days.push({
        date: d,
        duration: dayEntries.reduce((s, e) => s + e.duration, 0),
        calories: dayEntries.reduce((s, e) => s + e.calories, 0),
      })
    }
    return days
  }, [entries])

  const weekTotals = useMemo(() => ({
    duration: weekData.reduce((s, d) => s + d.duration, 0),
    calories: weekData.reduce((s, d) => s + d.calories, 0),
    activeDays: weekData.filter(d => d.duration > 0).length,
  }), [weekData])

  const maxDur = Math.max(...weekData.map(d => d.duration), 1)

  return (
    <Modal title="운동 기록" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 주간 통계 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: '주간 운동', value: `${weekTotals.duration}분`, color: T.teal },
            { label: '주간 칼로리', value: `${weekTotals.calories}kcal`, color: T.warning },
            { label: '운동일', value: `${weekTotals.activeDays}/7일`, color: T.success },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '8px 10px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 130 }} />
            <select className="win-select" value={type} onChange={e => setType(e.target.value)} style={{ fontSize: 12 }}>
              {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="win-input" value={duration} onChange={e => setDuration(e.target.value)} placeholder="분" type="number" style={{ width: 60, textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={sets} onChange={e => setSets(e.target.value)} placeholder="세트" style={{ width: 60 }} />
            <input className="win-input" value={reps} onChange={e => setReps(e.target.value)} placeholder="횟수" style={{ width: 60 }} />
            <input className="win-input" value={calories} onChange={e => setCalories(e.target.value)} placeholder="칼로리" type="number" style={{ width: 70 }} />
            <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모" style={{ flex: 1 }} />
            <button className="win-btn-primary" onClick={addEntry} style={{ fontSize: 12 }}>기록</button>
          </div>
        </div>

        {/* 오늘 기록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)' }}>{date} — {todayTotal.duration}분, {todayTotal.calories}kcal</div>
          {todayEntries.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>운동 기록이 없습니다</div>}
          {todayEntries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.teal, minWidth: 50 }}>{e.type}</span>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--win-text-sub)' }}>
                {e.duration > 0 && `${e.duration}분`}
                {e.sets && ` · ${e.sets}세트`}
                {e.reps && ` · ${e.reps}회`}
                {e.calories > 0 && ` · ${e.calories}kcal`}
                {e.memo && ` · ${e.memo}`}
              </div>
              <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(e.id)}>×</button>
            </div>
          ))}
        </div>

        {/* 주간 차트 */}
        <div style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 6 }}>주간 운동 시간</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 50 }}>
            {weekData.map(d => {
              const h = (d.duration / maxDur) * 100
              const isToday = d.date === todayStr()
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{d.duration || ''}</span>
                  <div style={{ width: '100%', height: 30, background: rgba(T.fg, 0.05), borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: isToday ? T.gold : rgba(T.teal, 0.4), borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? T.teal : 'var(--win-text-muted)' }}>{d.date.slice(8)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
