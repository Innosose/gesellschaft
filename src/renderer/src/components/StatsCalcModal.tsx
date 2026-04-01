import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

function calcStats(nums: number[]) {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const freq: Record<number, number> = {}
  sorted.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
  const maxFreq = Math.max(...Object.values(freq))
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq && f > 1).map(([v]) => Number(v))
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)
  const min = sorted[0]
  const max = sorted[n - 1]
  const range = max - min
  const q1 = n >= 4 ? percentile(sorted, 25) : sorted[0]
  const q3 = n >= 4 ? percentile(sorted, 75) : sorted[n - 1]
  return { mean, median, modes, variance, stdDev, min, max, range, sum, count: n, q1, q3 }
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function fmt(n: number): string { return Number.isInteger(n) ? n.toString() : n.toFixed(4) }

export default function StatsCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)

  const nums = useMemo(() => {
    return input.split(/[,\s]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  }, [input])

  const stats = useMemo(() => calcStats(nums), [nums])

  const copyAll = () => {
    if (!stats) return
    const text = [
      `개수: ${stats.count}`, `합계: ${fmt(stats.sum)}`, `평균: ${fmt(stats.mean)}`,
      `중앙값: ${fmt(stats.median)}`, `최빈값: ${stats.modes.length ? stats.modes.join(', ') : '없음'}`,
      `분산: ${fmt(stats.variance)}`, `표준편차: ${fmt(stats.stdDev)}`,
      `최솟값: ${fmt(stats.min)}`, `최댓값: ${fmt(stats.max)}`, `범위: ${fmt(stats.range)}`,
      `Q1: ${fmt(stats.q1)}`, `Q3: ${fmt(stats.q3)}`,
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }

  const ResultRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: `1px solid ${rgba(T.fg, 0.05)}` }}>
      <span style={{ fontSize: 13, color: 'var(--win-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)', fontFamily: 'monospace' }}>{value}</span>
    </div>
  )

  return (
    <Modal title="통계 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 6, display: 'block' }}>
            데이터 입력 (쉼표 또는 공백으로 구분)
          </label>
          <textarea
            className="win-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="예: 85, 90, 78, 92, 88, 76, 95"
            style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
          />
          <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>인식된 숫자: {nums.length}개</div>
        </div>

        {stats ? (
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
            <ResultRow label="개수 (N)" value={String(stats.count)} />
            <ResultRow label="합계" value={fmt(stats.sum)} />
            <ResultRow label="평균 (Mean)" value={fmt(stats.mean)} />
            <ResultRow label="중앙값 (Median)" value={fmt(stats.median)} />
            <ResultRow label="최빈값 (Mode)" value={stats.modes.length ? stats.modes.map(fmt).join(', ') : '없음'} />
            <ResultRow label="분산 (Variance)" value={fmt(stats.variance)} />
            <ResultRow label="표준편차 (Std Dev)" value={fmt(stats.stdDev)} />
            <ResultRow label="최솟값 (Min)" value={fmt(stats.min)} />
            <ResultRow label="최댓값 (Max)" value={fmt(stats.max)} />
            <ResultRow label="범위 (Range)" value={fmt(stats.range)} />
            <ResultRow label="제1사분위수 (Q1)" value={fmt(stats.q1)} />
            <ResultRow label="제3사분위수 (Q3)" value={fmt(stats.q3)} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
            숫자를 입력하면 통계가 표시됩니다
          </div>
        )}

        {stats && (
          <button className="win-btn-secondary" onClick={copyAll} style={{ alignSelf: 'flex-start', fontSize: 12 }}>
            {copied ? '복사됨!' : '결과 복사'}
          </button>
        )}
      </div>
    </Modal>
  )
}
