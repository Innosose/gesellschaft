import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type ChartType = 'line' | 'bar' | 'scatter'
type InputMode = 'points' | 'function'

interface Point { x: number; y: number }

function safePlotEval(expr: string, xVal: number): number {
  const FUNCS: Record<string, (n: number) => number> = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, log: Math.log, exp: Math.exp,
  }
  const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }
  const tokens: string[] = []
  let i = 0
  const s = expr.replace(/\s/g, '')
  while (i < s.length) {
    if ('0123456789.'.includes(s[i])) {
      let num = ''
      while (i < s.length && '0123456789.'.includes(s[i])) { num += s[i]; i++ }
      tokens.push(num)
    } else if ('+-*/^%(),'.includes(s[i])) {
      tokens.push(s[i]); i++
    } else if (/[a-zA-Z]/.test(s[i])) {
      let id = ''
      while (i < s.length && /[a-zA-Z]/.test(s[i])) { id += s[i]; i++ }
      tokens.push(id)
    } else {
      throw new Error('잘못된 문자')
    }
  }
  let pos = 0
  function peek(): string { return tokens[pos] ?? '' }
  function consume(): string { return tokens[pos++] }
  function parseExpr(): number {
    let left = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }
  function parseTerm(): number {
    let left = parsePower()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume()
      const right = parsePower()
      if (op === '*') left *= right
      else if (op === '/') { if (right === 0) throw new Error('0으로 나눌 수 없습니다'); left /= right }
      else left %= right
    }
    return left
  }
  function parsePower(): number {
    let base = parseUnary()
    while (peek() === '^') {
      consume()
      const exp = parseUnary()
      base = Math.pow(base, exp)
    }
    return base
  }
  function parseUnary(): number {
    if (peek() === '-') { consume(); return -parseUnary() }
    if (peek() === '+') { consume(); return parseUnary() }
    return parsePrimary()
  }
  function parsePrimary(): number {
    if (peek() === '(') { consume(); const v = parseExpr(); if (peek() === ')') consume(); return v }
    const tok = peek()
    if (tok === 'x') { consume(); return xVal }
    if (CONSTS[tok] !== undefined) { consume(); return CONSTS[tok] }
    if (FUNCS[tok]) {
      consume()
      if (peek() !== '(') throw new Error(`${tok} 뒤에 괄호가 필요합니다`)
      consume() // '('
      const arg = parseExpr()
      if (peek() === ')') consume()
      return FUNCS[tok](arg)
    }
    if (tok === 'pow') {
      consume()
      if (peek() !== '(') throw new Error('pow 뒤에 괄호가 필요합니다')
      consume()
      const base = parseExpr()
      if (peek() === ',') { consume() } else throw new Error('pow에 두 인수가 필요합니다')
      // comma is not a token char, handle as separate
      const exp = parseExpr()
      if (peek() === ')') consume()
      return Math.pow(base, exp)
    }
    const n = parseFloat(consume())
    if (isNaN(n)) throw new Error('잘못된 숫자')
    return n
  }
  const result = parseExpr()
  if (pos < tokens.length) throw new Error('잘못된 수식')
  return result
}

function evalFunc(expr: string, x: number): number {
  try { return safePlotEval(expr, x) } catch { return NaN }
}

export default function GraphPlotModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [mode, setMode] = useState<InputMode>('points')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [pointsInput, setPointsInput] = useState('0,0\n1,2\n2,4\n3,3\n4,5')
  const [funcExpr, setFuncExpr] = useState('x^2')
  const [xMin, setXMin] = useState('-5')
  const [xMax, setXMax] = useState('5')
  const [xLabel, setXLabel] = useState('X')
  const [yLabel, setYLabel] = useState('Y')

  const points: Point[] = useMemo(() => {
    if (mode === 'points') {
      return pointsInput.split('\n').map(l => {
        const [x, y] = l.split(',').map(s => parseFloat(s.trim()))
        return (!isNaN(x) && !isNaN(y)) ? { x, y } : null
      }).filter(Boolean) as Point[]
    } else {
      const lo = parseFloat(xMin) || -5, hi = parseFloat(xMax) || 5
      const pts: Point[] = []
      const step = (hi - lo) / 100
      for (let x = lo; x <= hi; x += step) {
        const y = evalFunc(funcExpr, x)
        if (isFinite(y)) pts.push({ x, y })
      }
      return pts
    }
  }, [mode, pointsInput, funcExpr, xMin, xMax])

  const W = 460, H = 280, PAD = 40

  const svg = useMemo(() => {
    if (points.length === 0) return null
    const xs = points.map(p => p.x), ys = points.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const rX = maxX - minX || 1, rY = maxY - minY || 1
    const sx = (v: number) => PAD + ((v - minX) / rX) * (W - 2 * PAD)
    const sy = (v: number) => H - PAD - ((v - minY) / rY) * (H - 2 * PAD)

    const gridLines: React.ReactNode[] = []
    for (let i = 0; i <= 5; i++) {
      const y = PAD + (i / 5) * (H - 2 * PAD)
      const val = (maxY - (i / 5) * rY).toFixed(1)
      gridLines.push(<line key={`gy${i}`} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={rgba(T.fg, 0.08)} />)
      gridLines.push(<text key={`gyt${i}`} x={PAD - 5} y={y + 4} fill={rgba(T.fg, 0.4)} fontSize={9} textAnchor="end">{val}</text>)
    }
    for (let i = 0; i <= 5; i++) {
      const x = PAD + (i / 5) * (W - 2 * PAD)
      const val = (minX + (i / 5) * rX).toFixed(1)
      gridLines.push(<line key={`gx${i}`} x1={x} y1={PAD} x2={x} y2={H - PAD} stroke={rgba(T.fg, 0.08)} />)
      gridLines.push(<text key={`gxt${i}`} x={x} y={H - PAD + 14} fill={rgba(T.fg, 0.4)} fontSize={9} textAnchor="middle">{val}</text>)
    }

    let dataEl: React.ReactNode = null
    if (chartType === 'line') {
      const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`).join(' ')
      dataEl = <path d={d} fill="none" stroke={T.gold} strokeWidth={2} />
    } else if (chartType === 'scatter') {
      dataEl = <>{points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={T.gold} />)}</>
    } else {
      const barW = Math.max(2, (W - 2 * PAD) / points.length - 2)
      const baseY = sy(Math.max(0, minY))
      dataEl = <>{points.map((p, i) => {
        const h = baseY - sy(p.y)
        return <rect key={i} x={sx(p.x) - barW / 2} y={h >= 0 ? sy(p.y) : baseY} width={barW} height={Math.abs(h)} fill={T.gold} rx={1} opacity={0.8} />
      })}</>
    }

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
        {gridLines}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={rgba(T.fg, 0.2)} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={rgba(T.fg, 0.2)} />
        {dataEl}
        <text x={W / 2} y={H - 4} fill={rgba(T.fg, 0.5)} fontSize={10} textAnchor="middle">{xLabel}</text>
        <text x={10} y={H / 2} fill={rgba(T.fg, 0.5)} fontSize={10} textAnchor="middle" transform={`rotate(-90, 10, ${H / 2})`}>{yLabel}</text>
      </svg>
    )
  }, [points, chartType, xLabel, yLabel])

  return (
    <Modal title="그래프 그리기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ id: 'points' as InputMode, l: '데이터 포인트' }, { id: 'function' as InputMode, l: '함수식' }].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: mode === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: mode === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.l}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {(['line', 'bar', 'scatter'] as ChartType[]).map(c => (
              <button key={c} onClick={() => setChartType(c)} style={{
                padding: '3px 10px', borderRadius: 5, border: chartType === c ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--win-border)',
                background: chartType === c ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--win-text)',
              }}>{{ line: '선', bar: '막대', scatter: '산점' }[c]}</button>
            ))}
          </div>
        </div>

        {mode === 'points' ? (
          <textarea className="win-textarea" value={pointsInput} onChange={e => setPointsInput(e.target.value)} placeholder="x,y (줄바꿈 구분)" style={{ minHeight: 70, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>y =</span>
            <input className="win-input" value={funcExpr} onChange={e => setFuncExpr(e.target.value)} placeholder="x^2" style={{ flex: 1, fontFamily: 'monospace' }} />
            <input className="win-input" value={xMin} onChange={e => setXMin(e.target.value)} style={{ width: 50, textAlign: 'center' }} placeholder="xMin" />
            <span style={{ color: 'var(--win-text-muted)' }}>~</span>
            <input className="win-input" value={xMax} onChange={e => setXMax(e.target.value)} style={{ width: 50, textAlign: 'center' }} placeholder="xMax" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <input className="win-input" value={xLabel} onChange={e => setXLabel(e.target.value)} placeholder="X축" style={{ width: 80 }} />
          <input className="win-input" value={yLabel} onChange={e => setYLabel(e.target.value)} placeholder="Y축" style={{ width: 80 }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)', alignSelf: 'center' }}>포인트: {points.length}개</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {points.length > 0 ? svg : (
            <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>데이터를 입력하세요</div>
          )}
        </div>
      </div>
    </Modal>
  )
}
