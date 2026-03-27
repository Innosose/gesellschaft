import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'

function calcAnnualLeave(hireDate: Date, refDate: Date): { years: number; months: number; entitlement: number; description: string } {
  const ms = refDate.getTime() - hireDate.getTime()
  const totalMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (totalMonths < 0) {
    return { years: 0, months: 0, entitlement: 0, description: '입사일이 미래입니다.' }
  }

  if (years < 1) {
    // 1년 미만: 1개월 만근 시 1일 (최대 11일)
    const entitlement = Math.min(months, 11)
    return { years, months, entitlement, description: `입사 ${months}개월차 → 월 1일씩 발생 (최대 11일)` }
  }

  // 1년 이상: 15일 기본, 3년차부터 2년마다 1일 추가, 최대 25일
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

export default function AnnualLeaveModal({
  onClose,
  asPanel,
}: {
  onClose: () => void
  asPanel?: boolean
}): React.ReactElement {
  const today = new Date()
  const [hireDate, setHireDate] = useState('')
  const [usedDays, setUsedDays] = useState('0')
  const [calcDate, setCalcDate] = useState(dateStr(today))

  const result = useMemo(() => {
    if (!hireDate) return null
    const hire = new Date(hireDate)
    const ref = new Date(calcDate)
    if (isNaN(hire.getTime()) || isNaN(ref.getTime())) return null
    if (hire > ref) return null
    return calcAnnualLeave(hire, ref)
  }, [hireDate, calcDate])

  const used = parseInt(usedDays) || 0
  const remaining = result ? Math.max(0, result.entitlement - used) : 0

  const progressPct = result && result.entitlement > 0
    ? Math.min(100, (used / result.entitlement) * 100)
    : 0

  return (
    <Modal title="연차 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 24, height: '100%', alignItems: 'flex-start' }}>
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

          <div
            style={{
              padding: '10px 12px',
              background: 'var(--win-surface-2)',
              borderRadius: 8,
              border: '1px solid var(--win-border)',
              fontSize: 11,
              color: 'var(--win-text-muted)',
              lineHeight: 1.7,
            }}
          >
            📋 근로기준법 제60조 기준<br />
            연차는 1년간 80% 이상 출근 시 발생하며, 실제 발생일수는 회사 규정에 따라 다를 수 있습니다.
          </div>
        </div>

        {/* 결과 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              {/* 근속 정보 */}
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--win-surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--win-border)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--win-text-muted)', marginBottom: 4 }}>근속 기간</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win-text)' }}>
                  {result.years > 0 ? `${result.years}년 ` : ''}{result.months}개월
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>
                  {result.description}
                </div>
              </div>

              {/* 연차 카드 */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'var(--win-surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--win-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>발생 연차</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--win-accent)' }}>
                    {result.entitlement}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>일</div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'var(--win-surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--win-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>사용 연차</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#e74c3c' }}>
                    {used}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>일</div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: remaining > 5
                      ? 'rgba(39,174,96,0.1)'
                      : remaining > 0
                        ? 'rgba(243,156,18,0.1)'
                        : 'rgba(231,76,60,0.08)',
                    borderRadius: 8,
                    border: `1px solid ${remaining > 5 ? '#27ae60' : remaining > 0 ? '#f39c12' : '#e74c3c'}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>잔여 연차</div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: remaining > 5 ? '#27ae60' : remaining > 0 ? '#f39c12' : '#e74c3c',
                    }}
                  >
                    {remaining}
                  </div>
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
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      background: progressPct >= 90 ? '#e74c3c' : progressPct >= 70 ? '#f39c12' : '#27ae60',
                      borderRadius: 4,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>

              {/* 연차 발생표 */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--win-text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
                  연차 발생 기준표
                </div>
                <div
                  style={{
                    border: '1px solid var(--win-border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
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
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--win-text-muted)',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              입사일을 입력하면<br />연차를 자동으로 계산합니다.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
