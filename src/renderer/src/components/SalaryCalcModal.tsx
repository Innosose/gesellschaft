import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

// 2024년 기준 4대보험 요율
const RATES = {
  nationalPension: 0.045,      // 국민연금 4.5% (월 기준소득 상한 590만원)
  healthInsurance: 0.03545,    // 건강보험 3.545%
  longTermCare: 0.1295,        // 장기요양보험 = 건강보험료 × 12.95%
  employmentInsurance: 0.009,  // 고용보험 0.9%
}

// 근로소득 간이세액 추정 (부양가족 인원별 공제 반영, 참고용)
function estimateIncomeTax(monthly: number, dependents: number): number {
  // 기본 공제: 1인당 15만원 / 월
  const deduction = dependents * 150000
  const taxable = Math.max(0, monthly - deduction)
  if (taxable <= 1060000) return 0

  let tax = 0
  if (taxable <= 1500000) {
    tax = (taxable - 1060000) * 0.06
  } else if (taxable <= 3000000) {
    tax = 26400 + (taxable - 1500000) * 0.15
  } else if (taxable <= 4500000) {
    tax = 251400 + (taxable - 3000000) * 0.24
  } else if (taxable <= 8000000) {
    tax = 611400 + (taxable - 4500000) * 0.35
  } else {
    tax = 1836400 + (taxable - 8000000) * 0.38
  }
  return Math.round(tax)
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

interface Row {
  label: string
  amount: number
  note?: string
}

export function SalaryCalcContent(): React.ReactElement {
  const [salaryInput, setSalaryInput] = useState('3000000')
  const [dependents, setDependents] = useState(1)
  const [mealAllowance, setMealAllowance] = useState(true)

  const salary = useMemo(() => {
    const n = parseInt(salaryInput.replace(/,/g, ''))
    return isNaN(n) || n < 0 ? 0 : n
  }, [salaryInput])

  const calc = useMemo(() => {
    if (salary === 0) return null

    // 국민연금: 상한 590만원 적용
    const pensionBase = Math.min(salary, 5900000)
    const nationalPension = Math.round(pensionBase * RATES.nationalPension / 10) * 10

    // 건강보험
    const healthInsurance = Math.round(salary * RATES.healthInsurance / 10) * 10

    // 장기요양보험 = 건강보험료 × 12.95%
    const longTermCare = Math.round(healthInsurance * RATES.longTermCare / 10) * 10

    // 고용보험
    const employmentInsurance = Math.round(salary * RATES.employmentInsurance / 10) * 10

    // 소득세 계산 (식대 비과세 20만원 반영)
    const taxableSalary = mealAllowance ? Math.max(0, salary - 200000) : salary
    const incomeTax = estimateIncomeTax(taxableSalary, dependents)
    const localTax = Math.round(incomeTax * 0.1)

    const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localTax
    const takeHome = salary - totalDeduction

    return {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localTax,
      totalDeduction,
      takeHome,
    }
  }, [salary, dependents, mealAllowance])

  const rows: Row[] = calc ? [
    { label: '국민연금', amount: calc.nationalPension, note: '4.5% (상한 590만원)' },
    { label: '건강보험', amount: calc.healthInsurance, note: '3.545%' },
    { label: '장기요양보험', amount: calc.longTermCare, note: '건강보험료 × 12.95%' },
    { label: '고용보험', amount: calc.employmentInsurance, note: '0.9%' },
    { label: '소득세', amount: calc.incomeTax, note: '간이세액 추정' },
    { label: '지방소득세', amount: calc.localTax, note: '소득세 × 10%' },
  ] : []

  return (
    <>
      <div style={{ display: 'flex', gap: 24, height: '100%' }}>
        {/* 입력 */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>
              월 기본급 (세전)
            </label>
            <input
              className="win-input"
              value={salaryInput}
              onChange={e => setSalaryInput(e.target.value)}
              placeholder="예: 3000000"
              style={{ textAlign: 'right' }}
            />
            {salary > 0 && (
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4, textAlign: 'right' }}>
                {salary.toLocaleString('ko-KR')}원
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>
              부양가족 수 (본인 포함)
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="win-btn-secondary"
                style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
                onClick={() => setDependents(d => Math.max(1, d - 1))}
              >
                −
              </button>
              <span style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--win-text)' }}>
                {dependents}
              </span>
              <button
                className="win-btn-secondary"
                style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
                onClick={() => setDependents(d => Math.min(10, d + 1))}
              >
                +
              </button>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>명</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mealAllowance}
                onChange={e => setMealAllowance(e.target.checked)}
              />
              <span style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>식대 비과세 적용</span>
            </label>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 4, paddingLeft: 22 }}>
              월 20만원 비과세 처리
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
            ℹ️ 2024년 기준 추정값입니다.<br />
            실제 급여명세서와 차이가 있을 수 있으며 참고용으로만 사용하세요.
          </div>
        </div>

        {/* 결과 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {calc ? (
            <>
              {/* 공제 내역 */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--win-text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
                공제 내역
              </div>
              <div
                style={{
                  border: '1px solid var(--win-border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                {rows.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '9px 14px',
                      borderBottom: i < rows.length - 1 ? '1px solid var(--win-border)' : undefined,
                      background: i % 2 === 0 ? 'transparent' : 'var(--win-surface-2)',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--win-text)' }}>{row.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--win-text-muted)', marginRight: 16 }}>{row.note}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.danger, minWidth: 100, textAlign: 'right' }}>
                      − {row.amount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                ))}
              </div>

              {/* 합계 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(231,76,60,0.08)',
                    borderRadius: 8,
                    border: '1px solid rgba(231,76,60,0.3)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>총 공제액</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.danger }}>
                    − {fmt(calc.totalDeduction)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--win-accent-dim)',
                    borderRadius: 8,
                    border: '1px solid var(--win-accent)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)' }}>실수령액 (예상)</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--win-accent)' }}>
                    {fmt(calc.takeHome)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 3 }}>연봉 환산 (세전)</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>
                      {(salary * 12).toLocaleString('ko-KR')}원
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 3 }}>연봉 환산 (세후)</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-accent)' }}>
                      {(calc.takeHome * 12).toLocaleString('ko-KR')}원
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 14 }}>
              월 기본급을 입력하면<br />공제 내역을 계산합니다.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function SalaryCalcModal({
  onClose,
  asPanel,
}: {
  onClose: () => void
  asPanel?: boolean
}): React.ReactElement {
  return (
    <Modal title="급여 계산기" onClose={onClose} asPanel={asPanel}>
      <SalaryCalcContent />
    </Modal>
  )
}
