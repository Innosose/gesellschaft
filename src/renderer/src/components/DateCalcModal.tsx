import React from 'react'
import { Modal } from './SearchModal'

type Tab = 'dday' | 'period' | 'add' | 'time'

interface DateCalcModalProps {
  onClose: () => void
  asPanel?: boolean
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return toDateStr(new Date())
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
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

export default function DateCalcModal({ onClose, asPanel }: DateCalcModalProps): React.ReactElement {
  const [tab, setTab] = React.useState<Tab>('dday')

  // D-Day
  const [ddayTarget, setDdayTarget] = React.useState(today())

  // 기간
  const [periodStart, setPeriodStart] = React.useState(today())
  const [periodEnd, setPeriodEnd] = React.useState(today())

  // 날짜 더하기
  const [addBase, setAddBase] = React.useState(today())
  const [addDays, setAddDays] = React.useState(0)
  const [addMonths, setAddMonths] = React.useState(0)
  const [addYears, setAddYears] = React.useState(0)

  // 시간 계산
  const [timeA, setTimeA] = React.useState(() => {
    const n = new Date()
    n.setSeconds(0, 0)
    return n.toISOString().slice(0, 16)
  })
  const [timeB, setTimeB] = React.useState(() => {
    const n = new Date()
    n.setSeconds(0, 0)
    return n.toISOString().slice(0, 16)
  })

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dday', label: 'D-Day 계산' },
    { id: 'period', label: '기간 계산' },
    { id: 'add', label: '날짜 더하기' },
    { id: 'time', label: '시간 계산' },
  ]

  // D-Day 계산
  const ddayResult = React.useMemo(() => {
    if (!ddayTarget) return null
    const now = new Date(today())
    const target = new Date(ddayTarget)
    const diff = diffDays(now, target)
    return diff
  }, [ddayTarget])

  // 기간 계산
  const periodResult = React.useMemo(() => {
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

  // 날짜 더하기
  const addResult = React.useMemo(() => {
    if (!addBase) return null
    const base = new Date(addBase)
    return addDuration(base, addDays, addMonths, addYears)
  }, [addBase, addDays, addMonths, addYears])

  // 시간 차이
  const timeDiff = React.useMemo(() => {
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

  return (
    <Modal title="날짜 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--win-border)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 18px',
                background: tab === t.id ? 'var(--win-accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--win-text-sub)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                borderRadius: '6px 6px 0 0',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* D-Day 계산 */}
        {tab === 'dday' && (
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
              <div
                style={{
                  padding: 24,
                  background: 'var(--win-surface-2)',
                  borderRadius: 12,
                  border: '1px solid var(--win-border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: ddayResult === 0 ? 'var(--win-success)' : ddayResult > 0 ? 'var(--win-accent)' : 'var(--win-warning)',
                    lineHeight: 1.1,
                  }}
                >
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
        {tab === 'period' && (
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
                    style={{
                      padding: '16px 20px',
                      background: 'var(--win-surface-2)',
                      borderRadius: 10,
                      border: '1px solid var(--win-border)',
                      textAlign: 'center',
                    }}
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
        {tab === 'add' && (
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
              <div
                style={{
                  padding: 20,
                  background: 'var(--win-surface-2)',
                  borderRadius: 12,
                  border: '1px solid var(--win-border)',
                  textAlign: 'center',
                }}
              >
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
        {tab === 'time' && (
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
                    style={{
                      padding: '16px',
                      background: 'var(--win-surface-2)',
                      borderRadius: 10,
                      border: '1px solid var(--win-border)',
                      textAlign: 'center',
                    }}
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
    </Modal>
  )
}
