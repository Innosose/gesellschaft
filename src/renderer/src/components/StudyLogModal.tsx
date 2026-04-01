import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface StudyEntry {
  id: number
  subject: string
  minutes: number
  date: string
  memo: string
}

const STORAGE_KEY = 'gesellschaft-study-log'
const SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '한국사', '기타'] as const
const SUBJECT_COLORS: Record<string, string> = {
  국어: T.danger, 영어: T.teal, 수학: T.warning, 과학: T.success, 사회: T.gold, 한국사: T.warning, 기타: T.fg,
}
let nextId = 1

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadEntries(): StudyEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const entries = JSON.parse(raw) as StudyEntry[]
    nextId = Math.max(...entries.map(e => e.id), 0) + 1
    return entries
  } catch { return [] }
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}시간 ${min > 0 ? `${min}분` : ''}` : `${min}분`
}

type Tab = 'log' | 'stats'

export default function StudyLogModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [entries, setEntries] = useState<StudyEntry[]>(loadEntries)
  const [tab, setTab] = useState<Tab>('log')

  // 입력 상태
  const [subject, setSubject] = useState<string>('수학')
  const [hours, setHours] = useState('1')
  const [mins, setMins] = useState('0')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(todayStr)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) }, [entries])

  const addEntry = useCallback(() => {
    const totalMin = (parseInt(hours) || 0) * 60 + (parseInt(mins) || 0)
    if (totalMin <= 0) return
    setEntries(prev => [{
      id: nextId++, subject, minutes: totalMin, date, memo: memo.trim(),
    }, ...prev])
    setHours('1'); setMins('0'); setMemo('')
  }, [subject, hours, mins, date, memo])

  const deleteEntry = useCallback((id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  // 통계
  const stats = useMemo(() => {
    const today = todayStr()
    const todayMin = entries.filter(e => e.date === today).reduce((sum, e) => sum + e.minutes, 0)

    // 최근 7일
    const now = new Date()
    const weekDates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    const weekData = weekDates.map(date => ({
      date,
      label: date.slice(5), // MM-DD
      minutes: entries.filter(e => e.date === date).reduce((sum, e) => sum + e.minutes, 0),
    }))
    const weekTotal = weekData.reduce((sum, d) => sum + d.minutes, 0)
    const maxMin = Math.max(...weekData.map(d => d.minutes), 60) // 최소 60분 기준

    // 과목별 통계
    const bySubject: Record<string, number> = {}
    for (const e of entries) bySubject[e.subject] = (bySubject[e.subject] ?? 0) + e.minutes
    const subjectStats = Object.entries(bySubject).sort((a, b) => b[1] - a[1])
    const totalAll = entries.reduce((sum, e) => sum + e.minutes, 0)

    // 연속 기록
    let streak = 0
    const d = new Date()
    while (true) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (entries.some(e => e.date === ds)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }

    return { todayMin, weekData, weekTotal, maxMin, subjectStats, totalAll, streak }
  }, [entries])

  // 날짜별 그룹
  const grouped = useMemo(() => {
    const groups: Record<string, StudyEntry[]> = {}
    for (const e of entries) {
      if (!groups[e.date]) groups[e.date] = []
      groups[e.date].push(e)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  return (
    <Modal title="공부 기록" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'log' as Tab, label: '기록하기' },
            { id: 'stats' as Tab, label: '통계' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45), transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
          {stats.streak > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.warning, fontWeight: 600, alignSelf: 'center' }}>
              🔥 {stats.streak}일 연속
            </span>
          )}
        </div>

        {tab === 'log' && (
          <>
            {/* 입력 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>과목</label>
                <select className="win-select" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 90 }}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>시간</label>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input className="win-input" type="number" min={0} value={hours} onChange={e => setHours(e.target.value)} style={{ width: 50, textAlign: 'center' }} />
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>시간</span>
                  <input className="win-input" type="number" min={0} max={59} value={mins} onChange={e => setMins(e.target.value)} style={{ width: 50, textAlign: 'center' }} />
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>분</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>날짜</label>
                <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 130 }} />
              </div>
              <input className="win-input" placeholder="메모 (선택)" value={memo} onChange={e => setMemo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEntry()} style={{ flex: 1, minWidth: 100 }} />
              <button className="win-btn-primary" onClick={addEntry}>기록</button>
            </div>

            {/* 오늘 요약 */}
            <div style={{ padding: '10px 16px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>오늘</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win-accent)' }}>{fmtMin(stats.todayMin)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>이번 주</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--win-text)' }}>{fmtMin(stats.weekTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>전체</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--win-text)' }}>{fmtMin(stats.totalAll)}</div>
              </div>
            </div>

            {/* 기록 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 4 }}>
                    {date} — {fmtMin(items.reduce((s, e) => s + e.minutes, 0))}
                  </div>
                  {items.map(e => (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderLeft: `3px solid ${SUBJECT_COLORS[e.subject] ?? T.fg}`,
                      background: 'var(--win-surface-2)', borderRadius: '0 6px 6px 0', marginBottom: 3,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: SUBJECT_COLORS[e.subject] ?? T.fg, width: 40 }}>{e.subject}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--win-text)', width: 70 }}>{fmtMin(e.minutes)}</span>
                      {e.memo && <span style={{ flex: 1, fontSize: 12, color: 'var(--win-text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.memo}</span>}
                      <button className="win-btn-ghost" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => deleteEntry(e.id)}>×</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'stats' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 주간 차트 */}
            <div style={{ padding: 16, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-text-sub)', marginBottom: 12 }}>최근 7일</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
                {stats.weekData.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{d.minutes > 0 ? fmtMin(d.minutes) : ''}</span>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: Math.max(4, (d.minutes / stats.maxMin) * 80),
                      background: d.date === todayStr() ? 'var(--win-accent)' : 'rgba(139,92,246,0.35)',
                      transition: 'height 0.3s',
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: d.date === todayStr() ? 700 : 400,
                      color: d.date === todayStr() ? 'var(--win-accent)' : 'var(--win-text-muted)',
                    }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 과목별 비율 */}
            <div style={{ padding: 16, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-text-sub)', marginBottom: 12 }}>과목별 누적</div>
              {stats.subjectStats.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 20 }}>기록이 없습니다</div>
              )}
              {stats.subjectStats.map(([subj, min]) => {
                const pct = stats.totalAll > 0 ? (min / stats.totalAll) * 100 : 0
                return (
                  <div key={subj} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: SUBJECT_COLORS[subj] ?? T.fg }}>{subj}</span>
                      <span style={{ color: 'var(--win-text-muted)' }}>{fmtMin(min)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 6, background: rgba(T.fg, 0.06), borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: SUBJECT_COLORS[subj] ?? T.fg, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
