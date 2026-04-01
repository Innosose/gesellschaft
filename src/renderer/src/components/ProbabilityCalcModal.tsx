import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

function factorial(n: number): number {
  if (n < 0) return NaN; if (n <= 1) return 1
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r
}
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0; return factorial(n) / (factorial(r) * factorial(n - r))
}
function nPr(n: number, r: number): number {
  if (r < 0 || r > n) return 0; return factorial(n) / factorial(n - r)
}
function binomProb(n: number, k: number, p: number): number {
  return nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
}
// Standard normal CDF approximation (Abramowitz and Stegun)
function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, pp = 0.3275911
  const sign = z < 0 ? -1 : 1; z = Math.abs(z) / Math.sqrt(2)
  const t = 1.0 / (1.0 + pp * z)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
  return 0.5 * (1.0 + sign * y)
}

type Tab = 'comb' | 'binom' | 'normal' | 'fact'

export default function ProbabilityCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<Tab>('comb')
  const [n, setN] = useState('5')
  const [r, setR] = useState('3')
  const [factN, setFactN] = useState('10')
  const [bn, setBn] = useState('10')
  const [bk, setBk] = useState('3')
  const [bp, setBp] = useState('0.5')
  const [zScore, setZScore] = useState('1.96')

  const combResult = useMemo(() => {
    const ni = parseInt(n), ri = parseInt(r)
    if (isNaN(ni) || isNaN(ri)) return null
    return { nCr: nCr(ni, ri), nPr: nPr(ni, ri) }
  }, [n, r])

  const factResult = useMemo(() => { const v = parseInt(factN); return isNaN(v) || v < 0 || v > 170 ? null : factorial(v) }, [factN])

  const binomResult = useMemo(() => {
    const ni = parseInt(bn), ki = parseInt(bk), pi = parseFloat(bp)
    if (isNaN(ni) || isNaN(ki) || isNaN(pi) || pi < 0 || pi > 1) return null
    const exact = binomProb(ni, ki, pi)
    let cumulative = 0; for (let i = 0; i <= ki; i++) cumulative += binomProb(ni, i, pi)
    return { exact, cumulative, mean: ni * pi, variance: ni * pi * (1 - pi) }
  }, [bn, bk, bp])

  const normalResult = useMemo(() => {
    const z = parseFloat(zScore)
    if (isNaN(z)) return null
    return { cdf: normalCDF(z), above: 1 - normalCDF(z), between: normalCDF(z) - normalCDF(-z) }
  }, [zScore])

  const fmt = (v: number) => v > 1e15 ? v.toExponential(4) : Number.isInteger(v) ? v.toLocaleString() : v.toFixed(6)

  const ResultRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${rgba(T.fg, 0.05)}` }}>
      <span style={{ fontSize: 13, color: 'var(--win-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.teal, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )

  return (
    <Modal title="확률 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8, flexWrap: 'wrap' }}>
          {([
            { id: 'comb' as Tab, l: '조합/순열' }, { id: 'fact' as Tab, l: '팩토리얼' },
            { id: 'binom' as Tab, l: '이항분포' }, { id: 'normal' as Tab, l: '정규분포' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'comb' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>n</label><input className="win-input" type="number" value={n} onChange={e => setN(e.target.value)} style={{ width: 80 }} /></div>
                <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>r</label><input className="win-input" type="number" value={r} onChange={e => setR(e.target.value)} style={{ width: 80 }} /></div>
              </div>
              {combResult && (
                <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
                  <ResultRow label={`C(${n},${r}) - 조합`} value={fmt(combResult.nCr)} />
                  <ResultRow label={`P(${n},${r}) - 순열`} value={fmt(combResult.nPr)} />
                </div>
              )}
            </div>
          )}

          {tab === 'fact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>n (0~170)</label><input className="win-input" type="number" min={0} max={170} value={factN} onChange={e => setFactN(e.target.value)} style={{ width: 100 }} /></div>
              {factResult !== null && (
                <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
                  <ResultRow label={`${factN}!`} value={fmt(factResult)} />
                </div>
              )}
            </div>
          )}

          {tab === 'binom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>시행 횟수 (n)</label><input className="win-input" type="number" value={bn} onChange={e => setBn(e.target.value)} style={{ width: 80 }} /></div>
                <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>성공 횟수 (k)</label><input className="win-input" type="number" value={bk} onChange={e => setBk(e.target.value)} style={{ width: 80 }} /></div>
                <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>성공 확률 (p)</label><input className="win-input" type="number" step="0.01" value={bp} onChange={e => setBp(e.target.value)} style={{ width: 80 }} /></div>
              </div>
              {binomResult && (
                <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
                  <ResultRow label="P(X = k) 정확히" value={binomResult.exact.toFixed(6)} />
                  <ResultRow label="P(X \u2264 k) 누적" value={binomResult.cumulative.toFixed(6)} />
                  <ResultRow label="\u03BC (평균)" value={binomResult.mean.toFixed(4)} />
                  <ResultRow label="\u03C3\u00B2 (분산)" value={binomResult.variance.toFixed(4)} />
                </div>
              )}
            </div>
          )}

          {tab === 'normal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>Z-score</label><input className="win-input" type="number" step="0.01" value={zScore} onChange={e => setZScore(e.target.value)} style={{ width: 120 }} /></div>
              {normalResult && (
                <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
                  <ResultRow label="P(Z \u2264 z) \u2014 왼쪽 꼬리" value={normalResult.cdf.toFixed(6)} />
                  <ResultRow label="P(Z > z) \u2014 오른쪽 꼬리" value={normalResult.above.toFixed(6)} />
                  <ResultRow label="P(-z \u2264 Z \u2264 z) \u2014 사이" value={normalResult.between.toFixed(6)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
