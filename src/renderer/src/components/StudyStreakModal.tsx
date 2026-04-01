import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const STORAGE_KEY = 'gs-study-streak'

interface StreakData {
  days: Record<string, boolean>
  currentStreak: number
  longestStreak: number
  totalDays: number
}

const BADGES: { label: string; days: number; color: string }[] = [
  { label: '3일 연속', days: 3, color: T.teal },
  { label: '7일 연속', days: 7, color: T.teal },
  { label: '14일 연속', days: 14, color: T.success },
  { label: '30일 연속', days: 30, color: T.gold },
  { label: '50일 연속', days: 50, color: T.warning },
  { label: '100일 연속', days: 100, color: T.danger },
]

function todayStr(): string { return new Date().toISOString().slice(0, 10) }

function dateStr(d: Date): string { return d.toISOString().slice(0, 10) }

function loadData(): StreakData {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      days: raw.days || {},
      currentStreak: raw.currentStreak || 0,
      longestStreak: raw.longestStreak || 0,
      totalDays: raw.totalDays || 0,
    }
  } catch {
    return { days: {}, currentStreak: 0, longestStreak: 0, totalDays: 0 }
  }
}

function calcStreak(days: Record<string, boolean>): { current: number; longest: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let current = 0
  const d = new Date(today)

  if (!days[dateStr(d)]) {
    d.setDate(d.getDate() - 1)
  }
  while (days[dateStr(d)]) {
    current++
    d.setDate(d.getDate() - 1)
  }

  const allDates = Object.keys(days).filter(k => days[k]).sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { run = 1 }
    else {
      const prev = new Date(allDates[i - 1])
      const curr = new Date(allDates[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      run = diff === 1 ? run + 1 : 1
    }
    if (run > longest) longest = run
  }

  return { current, longest: Math.max(longest, current) }
}

function getLevel(totalDays: number): { level: number; progress: number; next: number } {
  let level = 1
  let accumulated = 0
  while (level < 50) {
    const needed = level * 2
    if (accumulated + needed > totalDays) {
      return { level, progress: totalDays - accumulated, next: needed }
    }
    accumulated += needed
    level++
  }
  return { level: 50, progress: 0, next: 0 }
}

export default function StudyStreakModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [data, setData] = useState<StreakData>(loadData)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])

  const checkedInToday = !!data.days[todayStr()]

  const checkIn = useCallback(() => {
    if (checkedInToday) return
    setData(prev => {
      const newDays = { ...prev.days, [todayStr()]: true }
      const totalDays = Object.values(newDays).filter(Boolean).length
      const { current, longest } = calcStreak(newDays)
      return { days: newDays, currentStreak: current, longestStreak: longest, totalDays }
    })
  }, [checkedInToday])

  useEffect(() => {
    setData(prev => {
      const { current, longest } = calcStreak(prev.days)
      const totalDays = Object.values(prev.days).filter(Boolean).length
      return { ...prev, currentStreak: current, longestStreak: longest, totalDays }
    })
  }, [])

  const levelInfo = useMemo(() => getLevel(data.totalDays), [data.totalDays])

  const last30 = useMemo(() => {
    const arr: { date: string; checked: boolean; isToday: boolean }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const ds = dateStr(d)
      arr.push({ date: ds, checked: !!data.days[ds], isToday: i === 0 })
    }
    return arr
  }, [data.days])

  const earnedBadges = BADGES.filter(b => data.longestStreak >= b.days)

  return (
    <Modal title="공부 스트릭" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-4">
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <StatCard label="현재 스트릭" value={`${data.currentStreak}일`} color={T.teal} />
          <StatCard label="최장 기록" value={`${data.longestStreak}일`} color={T.gold} />
          <StatCard label="총 공부일" value={`${data.totalDays}일`} color={T.teal} />
        </div>

        {/* Level */}
        <div style={{
          background: rgba(T.gold, 0.06), borderRadius: 8, padding: '10px 14px',
          border: `1px solid ${rgba(T.gold, 0.12)}`
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>Lv. {levelInfo.level}</span>
            {levelInfo.next > 0 && (
              <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>
                다음 레벨까지 {levelInfo.next - levelInfo.progress}일
              </span>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: rgba(T.gold, 0.1) }}>
            <div style={{
              height: '100%', borderRadius: 3, background: T.gold,
              width: levelInfo.next > 0 ? `${(levelInfo.progress / levelInfo.next) * 100}%` : '100%',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Check-in */}
        <div style={{ textAlign: 'center' }}>
          <button
            className={checkedInToday ? 'win-btn-secondary' : 'win-btn-primary'}
            style={{ padding: '8px 28px', fontSize: 14, fontWeight: 600 }}
            onClick={checkIn}
            disabled={checkedInToday}
          >
            {checkedInToday ? '오늘 출석 완료!' : '오늘 출석 체크'}
          </button>
        </div>

        {/* 30-day grid */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 6 }}>최근 30일</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 }}>
            {last30.map(d => (
              <div
                key={d.date}
                title={d.date}
                style={{
                  aspectRatio: '1', borderRadius: 3,
                  background: d.checked ? T.teal : rgba(T.gold, 0.08),
                  opacity: d.checked ? 1 : 0.4,
                  border: d.isToday ? `1.5px solid ${T.gold}` : '1px solid transparent',
                  transition: 'background 0.2s'
                }}
              />
            ))}
          </div>
          <div className="flex justify-between" style={{ fontSize: 9, color: 'var(--win-text-muted)', marginTop: 2 }}>
            <span>{last30[0]?.date.slice(5)}</span>
            <span>오늘</span>
          </div>
        </div>

        {/* Badges */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 6 }}>배지</div>
          <div className="flex gap-2 flex-wrap">
            {BADGES.map(b => {
              const earned = earnedBadges.includes(b)
              return (
                <div key={b.days} style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 11,
                  background: earned ? rgba(b.color, 0.13) : rgba(T.gold, 0.04),
                  border: `1px solid ${earned ? b.color : rgba(T.gold, 0.1)}`,
                  color: earned ? b.color : 'var(--win-text-muted)',
                  opacity: earned ? 1 : 0.5,
                  fontWeight: earned ? 600 : 400
                }}>
                  {b.label}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }): React.ReactElement {
  return (
    <div style={{
      background: rgba(T.gold, 0.05), borderRadius: 8, padding: '10px 8px',
      border: `1px solid ${rgba(T.gold, 0.1)}`, textAlign: 'center'
    }}>
      <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
