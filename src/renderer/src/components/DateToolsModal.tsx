import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

// ── DateCalc types & helpers ───────────────────────────────────────────────────

type DateCalcTab = 'dday' | 'period' | 'add' | 'time'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return toDateStr(new Date())
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

function businessDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function addDuration(base: Date, days: number, months: number, years: number): Date {
  const d = new Date(base)
  d.setFullYear(d.getFullYear() + years)
  d.setMonth(d.getMonth() + months)
  d.setDate(d.getDate() + days)
  return d
}

function formatKorDate(d: Date): string {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

// ── AnnualLeave helpers ────────────────────────────────────────────────────────

function calcAnnualLeave(hireDate: Date, refDate: Date): { years: number; months: number; entitlement: number; description: string } {
  const ms = refDate.getTime() - hireDate.getTime()
  const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (totalMonths < 0) {
    return { years: 0, months: 0, entitlement: 0, description: '입사일이 미래입니다.' }
  }

  if (years < 1) {
    const entitlement = Math.min(months, 11)
    return { years, months, entitlement, description: `입사 ${months}개월차 → 월 1일씩 발생 (최대 11일)` }
  }

  let entitlement: number
  if (years < 3) {
    entitlement = 15
  } else {
    entitlement = Math.min(15 + Math.floor((years - 1) / 2), 25)
  }

  return {
    years,
    months,
    entitlement,
    description: years >= 3
      ? `근속 ${years}년 → 15일 + ${Math.floor((years - 1) / 2)}일 추가`
      : `근속 ${years}년 → 15일`,
  }
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Timezone helpers ───────────────────────────────────────────────────────────

interface TzCity {
  flag: string
  city: string
  country: string
  tz: string
}

const DEFAULT_CITIES: TzCity[] = [
  { flag: '🇰🇷', city: '서울',        country: '대한민국', tz: 'Asia/Seoul' },
  { flag: '🇯🇵', city: '도쿄',        country: '일본',     tz: 'Asia/Tokyo' },
  { flag: '🇨🇳', city: '베이징',      country: '중국',     tz: 'Asia/Shanghai' },
  { flag: '🇸🇬', city: '싱가포르',    country: '싱가포르', tz: 'Asia/Singapore' },
  { flag: '🇦🇪', city: '두바이',      country: 'UAE',      tz: 'Asia/Dubai' },
  { flag: '🇩🇪', city: '베를린',      country: '독일',     tz: 'Europe/Berlin' },
  { flag: '🇬🇧', city: '런던',        country: '영국',     tz: 'Europe/London' },
  { flag: '🇺🇸', city: '뉴욕',        country: '미국',     tz: 'America/New_York' },
  { flag: '🇺🇸', city: '로스앤젤레스', country: '미국',    tz: 'America/Los_Angeles' },
  { flag: '🇦🇺', city: '시드니',      country: '호주',     tz: 'Australia/Sydney' },
]

function formatTzTime(tz: string, now: Date): { time: string; date: string; offset: string; isToday: boolean } {
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('ko-KR', { timeZone: tz, ...opts }).format(now)

  const time   = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const date   = fmt({ month: 'short', day: 'numeric', weekday: 'short' })
  const localDate = new Intl.DateTimeFormat('ko-KR', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const hereDate  = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

  const offsetMs = (() => {
    try {
      const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' })
      const tzStr  = now.toLocaleString('en-US', { timeZone: tz })
      return (new Date(tzStr).getTime() - new Date(utcStr).getTime())
    } catch { return 0 }
  })()
  const h = Math.floor(Math.abs(offsetMs) / 3600000)
  const m = Math.floor((Math.abs(offsetMs) % 3600000) / 60000)
  const sign = offsetMs >= 0 ? '+' : '-'
  const offset = `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  return { time, date, offset, isToday: localDate === hereDate }
}

function TimezoneTab(): React.ReactElement {
  const [now, setNow] = useState(() => new Date())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
      {DEFAULT_CITIES.map(c => {
        const { time, date, offset, isToday } = formatTzTime(c.tz, now)
        const isSeoul = c.tz === 'Asia/Seoul'
        return (
          <div
            key={c.tz}
            style={{
              display: 'flex', alignItems: 'center', padding: '9px 14px', borderRadius: 8,
              background: isSeoul ? rgba(T.teal, 0.10) : rgba(T.fg, 0.04),
              border: `1px solid ${isSeoul ? rgba(T.teal, 0.35) : rgba(T.fg, 0.08)}`,
            }}
          >
            <span style={{ fontSize: 20, marginRight: 10, lineHeight: 1 }}>{c.flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {c.city}
                <span style={{ fontSize: 10, color: 'var(--win-text-muted)', fontWeight: 400 }}>{c.country}</span>
                {!isToday && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: rgba(T.warning, 0.15), border: `1px solid ${rgba(T.warning, 0.35)}`, color: T.warning }}>
                    +1일
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 1 }}>
                {date} · {offset}
              </div>
            </div>
            <span style={{
              fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: isSeoul ? T.gold : 'var(--win-text-sub)',
              letterSpacing: '0.03em', fontFamily: 'monospace',
            }}>
              {time}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface DateToolsModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function DateToolsModal({ onClose, asPanel }: DateToolsModalProps): React.ReactElement {
  const [tab, setTab] = useState<'dateCalc' | 'annualLeave' | 'timezone'>('dateCalc')

  // ── DateCalc state ────────────────────────────────────────────────────────
  const [dateCalcTab, setDateCalcTab] = useState<DateCalcTab>('dday')

  // D-Day
  const [ddayTarget, setDdayTarget] = useState(todayStr())

  // 기간
  const [periodStart, setPeriodStart] = useState(todayStr())
  const [periodEnd, setPeriodEnd] = useState(todayStr())

  // 날짜 더하기
  const [addBase, setAddBase] = useState(todayStr())
  const [addDays, setAddDays] = useState(0)
  const [addMonths, setAddMonths] = useState(0)
  const [addYears, setAddYears] = useState(0)

  // 시간 계산
  const [timeA, setTimeA] = useState(() => {
    const n = new Date()
    n.setSeconds(0, 0)
    return n.toISOString().slice(0, 16)
  })
  const [timeB, setTimeB] = useState(() => {
    const n = new Date()
    n.setSeconds(0, 0)
    return n.toISOString().slice(0, 16)
  })

  const DATE_CALC_TABS: { id: DateCalcTab; label: string }[] = [
    { id: 'dday', label: 'D-Day 계산' },
    { id: 'period', label: '기간 계산' },
    { id: 'add', label: '날짜 더하기' },
    { id: 'time', label: '시간 계산' },
  ]

  const ddayResult = useMemo(() => {
    if (!ddayTarget) return null
    const now = new Date(todayStr())
    const target = new Date(ddayTarget)
    return diffDays(now, target)
  }, [ddayTarget])

  const periodResult = useMemo(() => {
    if (!periodStart || !periodEnd) return null
    const s = new Date(periodStart)
    const e = new Date(periodEnd)
    if (s > e) return null
    const total = diffDays(s, e)
    const biz = businessDays(s, e)
    const weeks = Math.floor(total / 7)
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
    return { total, biz, weeks, months }
  }, [periodStart, periodEnd])

  const addResult = useMemo(() => {
    if (!addBase) return null
    const base = new Date(addBase)
    return addDuration(base, addDays, addMonths, addYears)
  }, [addBase, addDays, addMonths, addYears])

  const timeDiff = useMemo(() => {
    if (!timeA || !timeB) return null
    const a = new Date(timeA)
    const b = new Date(timeB)
    const diffMs = Math.abs(b.getTime() - a.getTime())
    const totalSec = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60
    return { hours, minutes, seconds, totalSec }
  }, [timeA, timeB])

  // ── AnnualLeave state ─────────────────────────────────────────────────────
  const today = new Date()
  const [hireDate, setHireDate] = useState('')
  const [usedDays, setUsedDays] = useState('0')
  const [calcDate, setCalcDate] = useState(dateStr(today))

  const annualResult = useMemo(() => {
    if (!hireDate) return null
    const hire = new Date(hireDate)
    const ref = new Date(calcDate)
    if (isNaN(hire.getTime()) || isNaN(ref.getTime())) return null
    if (hire > ref) return null
    return calcAnnualLeave(hire, ref)
  }, [hireDate, calcDate])

  const used = parseInt(usedDays) || 0
  const remaining = annualResult ? Math.max(0, annualResult.entitlement - used) : 0
  const progressPct = annualResult && annualResult.entitlement > 0
    ? Math.min(100, (used / annualResult.entitlement) * 100)
    : 0

  return (
    <Modal title="날짜 도구" onClose={onClose} asPanel={asPanel}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
        {([['dateCalc', '날짜 계산'], ['annualLeave', '연차 계산'], ['timezone', '타임존']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === id ? rgba(T.fg, 0.12) : 'transparent',
            color: tab === id ? T.fg : rgba(T.fg, 0.45),
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── 날짜 계산 탭 ── */}
      {tab === 'dateCalc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 내부 서브 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--win-border)' }}>
            {DATE_CALC_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setDateCalcTab(t.id)}
                style={{
                  padding: '8px 18px',
                  background: dateCalcTab === t.id ? 'var(--win-accent)' : 'transparent',
                  color: dateCalcTab === t.id ? T.fg : 'var(--win-text-sub)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: dateCalcTab === t.id ? 600 : 400,
                  borderRadius: '6px 6px 0 0',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* D-Day 계산 */}
          {dateCalcTab === 'dday' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 8 }}>목표 날짜</label>
                <input
                  type="date"
                  className="win-input"
                  style={{ width: 200 }}
                  value={ddayTarget}
                  onChange={e => setDdayTarget(e.target.value)}
                />
              </div>
              {ddayResult !== null && (
                <div style={{ padding: 24, background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 56, fontWeight: 800, color: ddayResult === 0 ? 'var(--win-success)' : ddayResult > 0 ? 'var(--win-accent)' : 'var(--win-warning)', lineHeight: 1.1 }}>
                    {ddayResult === 0 ? 'D-Day' : ddayResult > 0 ? `D-${ddayResult}` : `D+${Math.abs(ddayResult)}`}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--win-text-muted)', marginTop: 8 }}>
                    {formatKorDate(new Date(ddayTarget))}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--win-text-sub)', marginTop: 12 }}>
                    {ddayResult === 0
                      ? '오늘이 바로 그 날입니다!'
                      : ddayResult > 0
                        ? `${ddayResult}일 후`
                        : `${Math.abs(ddayResult)}일 전`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 기간 계산 */}
          {dateCalcTab === 'period' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>시작일</label>
                  <input type="date" className="win-input" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>종료일</label>
                  <input type="date" className="win-input" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>

              {periodResult ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { label: '총 일수', value: `${periodResult.total.toLocaleString()}일` },
                    { label: '영업일 수', value: `${periodResult.biz.toLocaleString()}일`, sub: '(주말 제외)' },
                    { label: '주 수', value: `${periodResult.weeks.toLocaleString()}주 ${periodResult.total % 7}일` },
                    { label: '개월 수', value: `약 ${periodResult.months}개월` },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{ padding: '16px 20px', background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)', textAlign: 'center' }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--win-accent)' }}>{item.value}</div>
                      {item.sub && <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 4 }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--win-text-muted)', fontSize: 13 }}>시작일과 종료일을 선택해주세요.</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
                ℹ️ 영업일 계산은 주말(토/일)만 제외합니다. 공휴일은 포함됩니다.
              </div>
            </div>
          )}

          {/* 날짜 더하기 */}
          {dateCalcTab === 'add' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>기준 날짜</label>
                <input type="date" className="win-input" value={addBase} onChange={e => setAddBase(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: '연도 추가', value: addYears, setter: setAddYears },
                  { label: '개월 추가', value: addMonths, setter: setAddMonths },
                  { label: '일수 추가', value: addDays, setter: setAddDays },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label style={{ fontSize: 12, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input
                      className="win-input"
                      type="number"
                      style={{ width: 100 }}
                      value={value}
                      onChange={e => setter(Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              {addResult && (
                <div style={{ padding: 20, background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--win-accent)' }}>
                    {toDateStr(addResult)}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--win-text-muted)', marginTop: 8 }}>
                    {formatKorDate(addResult)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 시간 계산 */}
          {dateCalcTab === 'time' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>시작 일시</label>
                  <input type="datetime-local" className="win-input" value={timeA} onChange={e => setTimeA(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>종료 일시</label>
                  <input type="datetime-local" className="win-input" value={timeB} onChange={e => setTimeB(e.target.value)} />
                </div>
              </div>

              {timeDiff && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: '시간', value: timeDiff.hours.toLocaleString() },
                    { label: '분', value: (timeDiff.hours * 60 + timeDiff.minutes).toLocaleString() },
                    { label: '초', value: timeDiff.totalSec.toLocaleString() },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{ padding: '16px', background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)', textAlign: 'center' }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--win-accent)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {timeDiff && (
                <div style={{ padding: '10px 16px', background: 'var(--win-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--win-text-sub)' }}>
                  {timeDiff.hours}시간 {timeDiff.minutes}분 {timeDiff.seconds}초 차이
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 연차 계산 탭 ── */}
      {tab === 'annualLeave' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* 입력 */}
          <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>
                입사일
              </label>
              <input
                type="date"
                className="win-input"
                value={hireDate}
                onChange={e => setHireDate(e.target.value)}
                max={dateStr(today)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>
                기준일 (오늘)
              </label>
              <input
                type="date"
                className="win-input"
                value={calcDate}
                onChange={e => setCalcDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>
                올해 사용한 연차
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="win-btn-secondary"
                  style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
                  onClick={() => setUsedDays(d => String(Math.max(0, parseInt(d) - 1)))}
                >
                  −
                </button>
                <input
                  className="win-input"
                  style={{ width: 60, textAlign: 'center' }}
                  value={usedDays}
                  onChange={e => setUsedDays(e.target.value)}
                />
                <button
                  className="win-btn-secondary"
                  style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
                  onClick={() => setUsedDays(d => String(parseInt(d) + 1))}
                >
                  +
                </button>
                <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>일</span>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', fontSize: 11, color: 'var(--win-text-muted)', lineHeight: 1.7 }}>
              📋 근로기준법 제60조 기준<br />
              연차는 1년간 80% 이상 출근 시 발생하며, 실제 발생일수는 회사 규정에 따라 다를 수 있습니다.
            </div>
          </div>

          {/* 결과 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {annualResult ? (
              <>
                {/* 근속 정보 */}
                <div style={{ padding: '12px 16px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--win-text-muted)', marginBottom: 4 }}>근속 기간</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win-text)' }}>
                    {annualResult.years > 0 ? `${annualResult.years}년 ` : ''}{annualResult.months}개월
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>
                    {annualResult.description}
                  </div>
                </div>

                {/* 연차 카드 */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, padding: '16px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>발생 연차</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--win-accent)' }}>{annualResult.entitlement}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>일</div>
                  </div>

                  <div style={{ flex: 1, padding: '16px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>사용 연차</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: T.danger }}>{used}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>일</div>
                  </div>

                  <div style={{
                    flex: 1, padding: '16px', textAlign: 'center', borderRadius: 8,
                    background: remaining > 5 ? rgba(T.success, 0.1) : remaining > 0 ? rgba(T.warning, 0.1) : rgba(T.danger, 0.08),
                    border: `1px solid ${remaining > 5 ? T.success : remaining > 0 ? T.warning : T.danger}`,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>잔여 연차</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: remaining > 5 ? T.success : remaining > 0 ? T.warning : T.danger }}>{remaining}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>일</div>
                  </div>
                </div>

                {/* 사용률 바 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>
                    <span>연차 사용률</span>
                    <span>{Math.round(progressPct)}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--win-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      background: progressPct >= 90 ? T.danger : progressPct >= 70 ? T.warning : T.success,
                      borderRadius: 4,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* 연차 발생표 */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--win-text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
                    연차 발생 기준표
                  </div>
                  <div style={{ border: '1px solid var(--win-border)', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      { range: '1년 미만', days: '월 1일 (최대 11일)' },
                      { range: '1~2년', days: '15일' },
                      { range: '3~4년', days: '16일' },
                      { range: '5~6년', days: '17일' },
                      { range: '7~8년', days: '18일' },
                      { range: '...매 2년', days: '+1일' },
                      { range: '21년 이상', days: '25일 (최대)' },
                    ].map((r, i) => (
                      <div
                        key={r.range}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          fontSize: 12,
                          borderBottom: i < 6 ? '1px solid var(--win-border)' : undefined,
                          background: i % 2 === 0 ? 'transparent' : 'var(--win-surface-2)',
                        }}
                      >
                        <span style={{ color: 'var(--win-text-muted)' }}>{r.range}</span>
                        <span style={{ fontWeight: 600, color: 'var(--win-text)' }}>{r.days}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 14, textAlign: 'center' }}>
                입사일을 입력하면<br />연차를 자동으로 계산합니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 타임존 탭 ── */}
      {tab === 'timezone' && <TimezoneTab />}
    </Modal>
  )
}
