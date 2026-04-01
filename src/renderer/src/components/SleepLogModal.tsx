import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface SleepEntry {
  id: number
  date: string
  bedtime: string
  wakeTime: string
  quality: number // 1-5
  memo: string
}

const STORAGE_KEY = 'gs-sleep'
const QUALITY_LABELS = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음']
const QUALITY_COLORS = ['', T.danger, T.warning, T.warning, T.success, T.gold]
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

function calcDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bedMin = bh * 60 + bm
  let wakeMin = wh * 60 + wm
  if (wakeMin <= bedMin) wakeMin += 24 * 60
  return (wakeMin - bedMin) / 60
}

function fmtDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}시간 ${m}분`
}

function load(): SleepEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as SleepEntry[]
    nextId = Math.max(...items.map(e => e.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: SleepEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function SleepLogModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [entries, setEntries] = useState<SleepEntry[]>(load)
  const [date, setDate] = useState(todayStr())
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [memo, setMemo] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const duration = useMemo(() => calcDuration(bedtime, wakeTime), [bedtime, wakeTime])

  const addEntry = (): void => {
    setEntries(prev => [...prev, { id: nextId++, date, bedtime, wakeTime, quality, memo: memo.trim() }])
    setDate(todayStr()); setBedtime('23:00'); setWakeTime('07:00'); setQuality(3); setMemo('')
  }

  const remove = (id: number): void => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries])

  // Weekly stats
  const weekStats = useMemo(() => {
    const days: SleepEntry[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(todayStr(), -i)
      const entry = entries.find(e => e.date === d)
      if (entry) days.push(entry)
    }
    if (days.length === 0) return null
    const avgDuration = days.reduce((s, e) => s + calcDuration(e.bedtime, e.wakeTime), 0) / days.length
    const avgQuality = days.reduce((s, e) => s + e.quality, 0) / days.length
    return { avgDuration, avgQuality, count: days.length }
  }, [entries])

  return (
    <Modal title="수면 기록" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 주간 통계 */}
        {weekStats && (
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: '주간 평균 수면', value: fmtDuration(weekStats.avgDuration), color: T.teal },
              { label: '평균 수면 질', value: `${weekStats.avgQuality.toFixed(1)} / 5`, color: QUALITY_COLORS[Math.round(weekStats.avgQuality)] },
              { label: '기록일', value: `${weekStats.count}/7일`, color: 'var(--win-text)' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--win-text-muted)', display: 'block' }}>날짜</label>
              <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 130 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--win-text-muted)', display: 'block' }}>취침</label>
              <input className="win-input" type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} style={{ width: 100 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--win-text-muted)', display: 'block' }}>기상</label>
              <input className="win-input" type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} style={{ width: 100 }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.teal, minWidth: 80 }}>{fmtDuration(duration)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>수면 질:</span>
            {[1, 2, 3, 4, 5].map(q => (
              <span key={q} onClick={() => setQuality(q)} style={{
                padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: quality === q ? rgba(QUALITY_COLORS[q], 0.2) : 'transparent',
                color: quality === q ? QUALITY_COLORS[q] : 'var(--win-text-muted)',
                border: quality === q ? `1px solid ${rgba(QUALITY_COLORS[q], 0.4)}` : '1px solid transparent',
              }}>{QUALITY_LABELS[q]}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)" style={{ flex: 1 }} />
            <button className="win-btn-primary" onClick={addEntry} style={{ fontSize: 12 }}>기록</button>
          </div>
        </div>

        {/* 기록 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>수면 기록을 추가하세요</div>}
          {sorted.map(e => {
            const dur = calcDuration(e.bedtime, e.wakeTime)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ minWidth: 70 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)' }}>{e.date}</div>
                  <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{e.bedtime} ~ {e.wakeTime}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.teal }}>{fmtDuration(dur)}</div>
                  {e.memo && <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{e.memo}</div>}
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: rgba(QUALITY_COLORS[e.quality], 0.13), color: QUALITY_COLORS[e.quality] }}>{QUALITY_LABELS[e.quality]}</span>
                <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(e.id)}>×</button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
