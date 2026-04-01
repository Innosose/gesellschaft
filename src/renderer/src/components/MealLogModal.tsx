import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface FoodItem {
  name: string
  calories: number
}

interface DayMeals {
  date: string
  meals: Record<MealType, FoodItem[]>
}

const STORAGE_KEY = 'gs-meals'
const MEAL_LABELS: Record<MealType, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' }
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function load(): DayMeals[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DayMeals[]
  } catch { return [] }
}

function save(items: DayMeals[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function getOrCreate(records: DayMeals[], date: string): DayMeals {
  const existing = records.find(r => r.date === date)
  if (existing) return existing
  return { date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } }
}

export default function MealLogModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [records, setRecords] = useState<DayMeals[]>(load)
  const [date, setDate] = useState(todayStr())
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')

  useEffect(() => { save(records) }, [records])

  const today = getOrCreate(records, date)
  const dailyTotal = useMemo(() =>
    MEAL_TYPES.reduce((sum, t) => sum + today.meals[t].reduce((s, f) => s + f.calories, 0), 0)
  , [today])

  const addFood = (): void => {
    if (!foodName.trim()) return
    const cal = parseInt(calories) || 0
    setRecords(prev => {
      const existing = prev.find(r => r.date === date)
      if (existing) {
        return prev.map(r => r.date === date ? { ...r, meals: { ...r.meals, [mealType]: [...r.meals[mealType], { name: foodName.trim(), calories: cal }] } } : r)
      }
      const newDay: DayMeals = { date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } }
      newDay.meals[mealType].push({ name: foodName.trim(), calories: cal })
      return [...prev, newDay]
    })
    setFoodName(''); setCalories('')
  }

  const removeFood = (meal: MealType, idx: number): void => {
    setRecords(prev => prev.map(r => {
      if (r.date !== date) return r
      return { ...r, meals: { ...r.meals, [meal]: r.meals[meal].filter((_, i) => i !== idx) } }
    }))
  }

  // Weekly chart
  const weekData = useMemo(() => {
    const days: { date: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(todayStr(), -i)
      const rec = records.find(r => r.date === d)
      const total = rec ? MEAL_TYPES.reduce((sum, t) => sum + rec.meals[t].reduce((s, f) => s + f.calories, 0), 0) : 0
      days.push({ date: d, total })
    }
    return days
  }, [records])

  const maxCal = Math.max(...weekData.map(d => d.total), 1)

  return (
    <Modal title="식단 기록" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 날짜 + 총 칼로리 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 150 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: T.teal }}>{dailyTotal.toLocaleString()} kcal</div>
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select className="win-select" value={mealType} onChange={e => setMealType(e.target.value as MealType)} style={{ fontSize: 12, width: 70 }}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{MEAL_LABELS[t]}</option>)}
          </select>
          <input className="win-input" value={foodName} onChange={e => setFoodName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFood()} placeholder="음식명" style={{ flex: 1 }} />
          <input className="win-input" value={calories} onChange={e => setCalories(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFood()} placeholder="kcal" type="number" style={{ width: 70, textAlign: 'center' }} />
          <button className="win-btn-primary" onClick={addFood} style={{ fontSize: 12 }}>추가</button>
        </div>

        {/* 식단 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEAL_TYPES.map(t => {
            const items = today.meals[t]
            const mealCal = items.reduce((s, f) => s + f.calories, 0)
            return (
              <div key={t} style={{ padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: items.length ? 6 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)' }}>{MEAL_LABELS[t]}</span>
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{mealCal} kcal</span>
                </div>
                {items.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>{f.name}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{f.calories} kcal</span>
                      <button onClick={() => removeFood(t, i)} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 10 }}>×</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div style={{ fontSize: 11, color: 'var(--win-text-muted)', paddingLeft: 8 }}>기록 없음</div>}
              </div>
            )
          })}
        </div>

        {/* 주간 차트 */}
        <div style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 8 }}>주간 칼로리</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
            {weekData.map(d => {
              const h = (d.total / maxCal) * 100
              const isToday = d.date === todayStr()
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{d.total || ''}</span>
                  <div style={{ width: '100%', height: 40, background: rgba(T.fg, 0.05), borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
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
