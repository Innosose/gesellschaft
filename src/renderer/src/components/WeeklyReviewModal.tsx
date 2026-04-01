import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface WeeklyReview {
  id: string // week start date
  weekLabel: string
  achievements: string
  challenges: string
  nextPlans: string
  mood: number
  energy: number
  productivity: number
}

const STORAGE_KEY = 'gs-weekly-review'

function getWeekStart(d: Date = new Date()): string {
  const date = new Date(d)
  date.setDate(date.getDate() - date.getDay())
  return date.toISOString().slice(0, 10)
}

function getWeekEnd(startStr: string): string {
  const d = new Date(startStr)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

function getWeekLabel(startStr: string): string {
  const end = getWeekEnd(startStr)
  return `${startStr} ~ ${end}`
}

function addWeeks(startStr: string, weeks: number): string {
  const d = new Date(startStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function load(): WeeklyReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WeeklyReview[]
  } catch { return [] }
}

function save(items: WeeklyReview[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const RATING_LABELS = ['', '매우 낮음', '낮음', '보통', '높음', '매우 높음']
const RATING_COLORS = ['', T.danger, T.warning, T.warning, T.success, T.gold]

function RatingSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--win-text-sub)', minWidth: 60 }}>{label}</span>
      {[1, 2, 3, 4, 5].map(r => (
        <span key={r} onClick={() => onChange(r)} style={{
          width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: value === r ? `${RATING_COLORS[r]}33` : rgba(T.fg, 0.05),
          color: value === r ? RATING_COLORS[r] : 'var(--win-text-muted)',
          border: value === r ? `1px solid ${RATING_COLORS[r]}66` : '1px solid transparent',
        }}>{r}</span>
      ))}
      {value > 0 && <span style={{ fontSize: 10, color: RATING_COLORS[value] }}>{RATING_LABELS[value]}</span>}
    </div>
  )
}

export default function WeeklyReviewModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [reviews, setReviews] = useState<WeeklyReview[]>(load)
  const [currentWeek, setCurrentWeek] = useState(getWeekStart())
  const [achievements, setAchievements] = useState('')
  const [challenges, setChallenges] = useState('')
  const [nextPlans, setNextPlans] = useState('')
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [productivity, setProductivity] = useState(3)

  useEffect(() => { save(reviews) }, [reviews])

  // Load current week's review
  useEffect(() => {
    const existing = reviews.find(r => r.id === currentWeek)
    if (existing) {
      setAchievements(existing.achievements)
      setChallenges(existing.challenges)
      setNextPlans(existing.nextPlans)
      setMood(existing.mood)
      setEnergy(existing.energy)
      setProductivity(existing.productivity)
    } else {
      setAchievements(''); setChallenges(''); setNextPlans('')
      setMood(3); setEnergy(3); setProductivity(3)
    }
  }, [currentWeek, reviews])

  const saveReview = (): void => {
    const review: WeeklyReview = {
      id: currentWeek,
      weekLabel: getWeekLabel(currentWeek),
      achievements: achievements.trim(),
      challenges: challenges.trim(),
      nextPlans: nextPlans.trim(),
      mood, energy, productivity,
    }
    setReviews(prev => {
      const existing = prev.findIndex(r => r.id === currentWeek)
      if (existing >= 0) {
        return prev.map((r, i) => i === existing ? review : r)
      }
      return [...prev, review]
    })
  }

  const prevWeeks = useMemo(() =>
    [...reviews].filter(r => r.id !== currentWeek).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8)
  , [reviews, currentWeek])

  const hasExisting = reviews.some(r => r.id === currentWeek)
  const weekLabel = getWeekLabel(currentWeek)

  return (
    <Modal title="주간 리뷰" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 주 선택 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <button className="win-btn-ghost" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))} style={{ fontSize: 14 }}>&larr;</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{weekLabel}</div>
            {currentWeek === getWeekStart() && <div style={{ fontSize: 10, color: T.teal }}>이번 주</div>}
          </div>
          <button className="win-btn-ghost" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} style={{ fontSize: 14 }}>&rarr;</button>
        </div>

        {/* 리뷰 폼 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>이번 주 성과</label>
            <textarea className="win-input" value={achievements} onChange={e => setAchievements(e.target.value)} placeholder="이번 주에 이룬 것들..." rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>어려웠던 점</label>
            <textarea className="win-input" value={challenges} onChange={e => setChallenges(e.target.value)} placeholder="어려움, 개선할 점..." rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>다음 주 계획</label>
            <textarea className="win-input" value={nextPlans} onChange={e => setNextPlans(e.target.value)} placeholder="다음 주 목표, 할 일..." rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          {/* 평가 */}
          <div style={{ padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RatingSelector label="기분" value={mood} onChange={setMood} />
            <RatingSelector label="에너지" value={energy} onChange={setEnergy} />
            <RatingSelector label="생산성" value={productivity} onChange={setProductivity} />
          </div>

          <button className="win-btn-primary" onClick={saveReview} style={{ alignSelf: 'flex-start' }}>
            {hasExisting ? '리뷰 수정' : '리뷰 저장'}
          </button>

          {/* 이전 리뷰 */}
          {prevWeeks.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', marginTop: 8 }}>이전 리뷰</div>
              {prevWeeks.map(r => (
                <div key={r.id} onClick={() => setCurrentWeek(r.id)} style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)' }}>{r.weekLabel}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, color: RATING_COLORS[r.mood] }}>기분 {r.mood}</span>
                      <span style={{ fontSize: 10, color: RATING_COLORS[r.energy] }}>에너지 {r.energy}</span>
                      <span style={{ fontSize: 10, color: RATING_COLORS[r.productivity] }}>생산성 {r.productivity}</span>
                    </div>
                  </div>
                  {r.achievements && <div style={{ fontSize: 11, color: 'var(--win-text-sub)', maxHeight: 30, overflow: 'hidden' }}>{r.achievements.slice(0, 80)}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
