import React, { useState, useMemo, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Size = 2 | 3
type Op = 'add' | 'sub' | 'mul' | 'det' | 'inv' | 'trans'

function newMatrix(size: Size): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function det2(m: number[][]): number { return m[0][0] * m[1][1] - m[0][1] * m[1][0] }

function det3(m: number[][]): number {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
}

function det(m: number[][]): number { return m.length === 2 ? det2(m) : det3(m) }

function transpose(m: number[][]): number[][] {
  const n = m.length
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => m[j][i]))
}

function add(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]))
}

function sub(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]))
}

function mul(a: number[][], b: number[][]): number[][] {
  const n = a.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0; for (let k = 0; k < n; k++) s += a[i][k] * b[k][j]; return s
    })
  )
}

function inv2(m: number[][]): number[][] | null {
  const d = det2(m); if (Math.abs(d) < 1e-10) return null
  return [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]]
}

function inv3(m: number[][]): number[][] | null {
  const d = det3(m); if (Math.abs(d) < 1e-10) return null
  const cofactors = [
    [m[1][1] * m[2][2] - m[1][2] * m[2][1], -(m[1][0] * m[2][2] - m[1][2] * m[2][0]), m[1][0] * m[2][1] - m[1][1] * m[2][0]],
    [-(m[0][1] * m[2][2] - m[0][2] * m[2][1]), m[0][0] * m[2][2] - m[0][2] * m[2][0], -(m[0][0] * m[2][1] - m[0][1] * m[2][0])],
    [m[0][1] * m[1][2] - m[0][2] * m[1][1], -(m[0][0] * m[1][2] - m[0][2] * m[1][0]), m[0][0] * m[1][1] - m[0][1] * m[1][0]],
  ]
  return cofactors.map(row => row.map(v => v / d))
}

function inverse(m: number[][]): number[][] | null { return m.length === 2 ? inv2(m) : inv3(m) }

function fmt(n: number): string { return Math.abs(n) < 1e-10 ? '0' : Number.isInteger(n) ? String(n) : n.toFixed(3) }

export default function MatrixCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [size, setSize] = useState<Size>(2)
  const [matA, setMatA] = useState<number[][]>(newMatrix(2))
  const [matB, setMatB] = useState<number[][]>(newMatrix(2))
  const [op, setOp] = useState<Op>('add')

  const changeSize = useCallback((s: Size) => {
    setSize(s); setMatA(newMatrix(s)); setMatB(newMatrix(s))
  }, [])

  const updateCell = useCallback((which: 'A' | 'B', r: number, c: number, val: string) => {
    const setter = which === 'A' ? setMatA : setMatB
    setter(prev => prev.map((row, i) => i === r ? row.map((v, j) => j === c ? (parseFloat(val) || 0) : v) : [...row]))
  }, [])

  const result = useMemo((): { matrix?: number[][]; scalar?: number; error?: string } => {
    try {
      switch (op) {
        case 'add': return { matrix: add(matA, matB) }
        case 'sub': return { matrix: sub(matA, matB) }
        case 'mul': return { matrix: mul(matA, matB) }
        case 'det': return { scalar: det(matA) }
        case 'trans': return { matrix: transpose(matA) }
        case 'inv': { const r = inverse(matA); return r ? { matrix: r } : { error: '역행렬이 존재하지 않습니다 (det = 0)' } }
      }
    } catch { return { error: '계산 오류' } }
  }, [matA, matB, op, size])

  const needsB = op === 'add' || op === 'sub' || op === 'mul'

  const MatrixInput = ({ label, matrix, which }: { label: string; matrix: number[][]; which: 'A' | 'B' }) => (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${size}, 60px)`, gap: 4 }}>
        {matrix.map((row, i) => row.map((v, j) => (
          <input key={`${i}-${j}`} className="win-input" type="number" value={v || ''} onChange={e => updateCell(which, i, j, e.target.value)}
            style={{ width: 60, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, padding: '4px 2px' }} />
        )))}
      </div>
    </div>
  )

  const MatrixDisplay = ({ matrix }: { matrix: number[][] }) => (
    <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${matrix[0].length}, auto)`, gap: '4px 12px' }}>
      {matrix.map((row, i) => row.map((v, j) => (
        <span key={`${i}-${j}`} style={{ fontFamily: 'monospace', fontSize: 14, color: T.teal, textAlign: 'center' }}>{fmt(v)}</span>
      )))}
    </div>
  )

  return (
    <Modal title="행렬 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>크기:</span>
          {([2, 3] as Size[]).map(s => (
            <button key={s} onClick={() => changeSize(s)} className={size === s ? 'win-btn-primary' : 'win-btn-secondary'} style={{ fontSize: 12, padding: '3px 12px' }}>{s}x{s}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            { id: 'add' as Op, l: '덧셈 (A+B)' }, { id: 'sub' as Op, l: '뺄셈 (A-B)' }, { id: 'mul' as Op, l: '곱셈 (AxB)' },
            { id: 'det' as Op, l: '행렬식 (A)' }, { id: 'inv' as Op, l: '역행렬 (A)' }, { id: 'trans' as Op, l: '전치 (A)' },
          ]).map(t => (
            <button key={t.id} onClick={() => setOp(t.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: op === t.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--win-border)',
              background: op === t.id ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--win-text)',
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <MatrixInput label="행렬 A" matrix={matA} which="A" />
          {needsB && <MatrixInput label="행렬 B" matrix={matB} which="B" />}
        </div>

        <div style={{ flex: 1, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>결과</div>
          {result.error && <div style={{ color: T.danger, fontSize: 13 }}>{result.error}</div>}
          {result.scalar !== undefined && <div style={{ fontSize: 24, fontWeight: 700, color: T.teal, fontFamily: 'monospace' }}>{fmt(result.scalar)}</div>}
          {result.matrix && <MatrixDisplay matrix={result.matrix} />}
        </div>
      </div>
    </Modal>
  )
}
