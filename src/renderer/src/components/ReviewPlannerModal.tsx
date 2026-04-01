import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface ReviewItem {
  id: number
  title: string
  subject: string
  firstDate: string
  reviews: Record<string, boolean> // date -> done
}

const STORAGE_KEY = 'gs-review-planner'
const INTERVALS = [1, 3, 7, 14, 30]
const INTERVAL_LABELS = ['1일', '3일', '7일', '14일', '30일']
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

function load(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as ReviewItem[]
    nextId = Math.max(...items.map(r => r.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: ReviewItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function ReviewPlannerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [items, setItems] = useState<ReviewItem[]>(load)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [tab, setTab] = useState<'today' | 'all' | 'calendar'>('today')

  useEffect(() => { save(items) }, [items])

  const today = todayStr()

  const addItem = (): void => {
    if (!title.trim()) return
    setItems(prev => [...prev, { id: nextId++, title: title.trim(), subject: subject.trim(), firstDate: today, reviews: {} }])
    setTitle(''); setSubject('')
  }

  const getReviewDates = (item: ReviewItem): string[] =>
    INTERVALS.map(d => addDays(item.firstDate, d))

  const todayReviews = useMemo(() => {
    const result: { item: ReviewItem; intervalIdx: number }[] = []
    for (const item of items) {
      const dates = getReviewDates(item)
      dates.forEach((date, idx) => {
        if (date === today) result.push({ item, intervalIdx: idx })
      })
    }
    return result
  }, [items, today])

  const toggleReview = (id: number, date: string): void => {
    setItems(prev => prev.map(r => {
      if (r.id !== id) return r
      const reviews = { ...r.reviews }
      reviews[date] = !reviews[date]
      return { ...r, reviews }
    }))
  }

  const remove = (id: number): void => {
    setItems(prev => prev.filter(r => r.id !== id))
  }

  // Calendar: next 14 days
  const calendarDays = useMemo(() => {
    const days: string[] = []
    for (let i = 0; i < 14; i++) days.push(addDays(today, i))
    return days
  }, [today])

  const calendarData = useMemo(() => {
    const map: Record<string, { item: ReviewItem; idx: number }[]> = {}
    for (const item of items) {
      const dates = getReviewDates(item)
      dates.forEach((date, idx) => {
        if (!map[date]) map[date] = []
        map[date].push({ item, idx })
      })
    }
    return map
  }, [items])

  return (
    <Modal title="복습 계획" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="복습할 내용" style={{ flex: 1 }} />
          <input className="win-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="과목" style={{ width: 80 }} />
          <button className="win-btn-primary" onClick={addItem} style={{ fontSize: 12 }}>추가</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>간격: {INTERVAL_LABELS.join(' → ')}</div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'today' as const, label: `오늘 복습 (${todayReviews.length})` }, { id: 'calendar' as const, label: '캘린더' }, { id: 'all' as const, label: '전체 목록' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayReviews.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>오늘 복습할 항목이 없습니다</div>}
              {todayReviews.map(({ item, intervalIdx }) => (
                <div key={`${item.id}-${intervalIdx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <span onClick={() => toggleReview(item.id, today)} style={{ cursor: 'pointer', fontSize: 16 }}>{item.reviews[today] ? '☑' : '☐'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: item.reviews[today] ? 'var(--win-text-muted)' : 'var(--win-text)', textDecoration: item.reviews[today] ? 'line-through' : 'none' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{item.subject && `${item.subject} · `}{INTERVAL_LABELS[intervalIdx]} 복습</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {calendarDays.map(day => {
                const entries = calendarData[day] || []
                const isToday = day === today
                return (
                  <div key={day} style={{ padding: '8px 12px', background: isToday ? 'rgba(99,102,241,0.15)' : 'var(--win-surface-2)', borderRadius: 8, border: `1px solid ${isToday ? 'rgba(99,102,241,0.4)' : 'var(--win-border)'}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? T.teal : 'var(--win-text-sub)', marginBottom: entries.length ? 4 : 0 }}>
                      {day}{isToday ? ' (오늘)' : ''} — {entries.length}건
                    </div>
                    {entries.map(({ item, idx }) => (
                      <div key={`${item.id}-${idx}`} style={{ fontSize: 11, color: 'var(--win-text-muted)', paddingLeft: 8 }}>
                        {item.reviews[day] ? '✓' : '○'} {item.title} ({INTERVAL_LABELS[idx]})
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>복습 항목을 추가하세요</div>}
              {items.map(item => {
                const dates = getReviewDates(item)
                const doneCount = dates.filter(d => item.reviews[d]).length
                return (
                  <div key={item.id} style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{item.title}</span>
                      <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(item.id)}>×</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {dates.map((d, i) => (
                        <span key={i} onClick={() => toggleReview(item.id, d)} style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                          background: item.reviews[d] ? rgba(T.success, 0.2) : rgba(T.fg, 0.05),
                          color: item.reviews[d] ? T.success : 'var(--win-text-muted)',
                        }}>{INTERVAL_LABELS[i]} {item.reviews[d] ? '✓' : '○'}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 4 }}>{item.subject && `${item.subject} · `}시작: {item.firstDate} · {doneCount}/{INTERVALS.length} 완료</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
