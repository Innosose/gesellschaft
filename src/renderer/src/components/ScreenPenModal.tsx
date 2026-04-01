import React, { useState, useRef, useCallback, useEffect } from 'react'
import { T, rgba } from '../utils/theme'
import OverlayPortal from '../utils/OverlayPortal'

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  size: number
  eraser: boolean
}

const COLORS = [T.danger, T.teal, T.gold, T.success, T.fg]

export default function ScreenPenModal({ onClose }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [penSize, setPenSize] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [dimBg, setDimBg] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const currentStroke = useRef<Stroke | null>(null)
  const drawing = useRef(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const all = currentStroke.current ? [...strokes, currentStroke.current] : strokes
    for (const s of all) {
      if (s.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = s.eraser ? T.bg : s.color
      ctx.lineWidth = s.eraser ? s.size * 3 : s.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over'
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }, [strokes])

  useEffect(() => { redraw() }, [redraw])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    redraw()
  }, [redraw])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const onMouseDown = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('[data-toolbar]')) return
    drawing.current = true
    currentStroke.current = { points: [{ x: e.clientX, y: e.clientY }], color, size: penSize, eraser }
  }

  const onMouseMove = (e: React.MouseEvent): void => {
    if (!drawing.current || !currentStroke.current) return
    currentStroke.current.points.push({ x: e.clientX, y: e.clientY })
    redraw()
  }

  const onMouseUp = (): void => {
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      setStrokes(prev => {
        const next = [...prev, currentStroke.current!]
        return next.length > 20 ? next.slice(-20) : next
      })
    }
    currentStroke.current = null
    drawing.current = false
  }

  const undo = (): void => setStrokes(prev => prev.slice(0, -1))
  const clearAll = (): void => setStrokes([])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { onClose(); e.stopPropagation() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
    border: `1px solid ${rgba(T.gold, 0.12)}`,
    background: active ? rgba(T.teal, 0.12) : rgba(T.gold, 0.04),
    color: active ? T.teal : rgba(T.fg, 0.6),
    fontWeight: active ? 600 : 400,
  })

  return (
    <OverlayPortal>
      {/* Dim background layer */}
      {dimBg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: 0 }} />
      )}

      {/* Full-screen drawing area */}
      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'auto', cursor: eraser ? 'cell' : 'crosshair', zIndex: 1 }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>

      {/* Floating toolbar */}
      <div data-toolbar style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 10,
        background: rgba(T.bg, 0.92),
        border: `1px solid ${rgba(T.gold, 0.12)}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        pointerEvents: 'auto', zIndex: 10,
        fontSize: 10,
      }}>
        {/* Color buttons */}
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); setEraser(false) }}
            style={{
              width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
              border: color === c && !eraser ? `2px solid ${T.gold}` : '2px solid transparent',
            }}
          />
        ))}
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        {/* Pen size */}
        <label style={{ fontSize: 10, color: rgba(T.fg, 0.5), display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="range" min={2} max={10} value={penSize} onChange={e => setPenSize(+e.target.value)}
            style={{ width: 50 }} />
          <span style={{ color: T.gold, minWidth: 14 }}>{penSize}</span>
        </label>
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        <button onClick={() => setEraser(!eraser)} style={btnStyle(eraser)} title="지우개">
          지우개
        </button>
        <button onClick={() => setDimBg(!dimBg)} style={btnStyle(dimBg)} title="배경 어둡게">
          어둡게
        </button>
        <button onClick={undo} disabled={strokes.length === 0} style={btnStyle()} title="되돌리기">
          되돌리기
        </button>
        <button onClick={clearAll} disabled={strokes.length === 0} style={{ ...btnStyle(), borderColor: rgba(T.danger, 0.15), color: rgba(T.danger, 0.6) }} title="전체 지우기">
          전체 지우기
        </button>
        <button onClick={onClose} title="닫기 (Esc)" style={{
          width: 22, height: 22, borderRadius: 4,
          border: `1px solid ${rgba(T.danger, 0.2)}`,
          background: rgba(T.danger, 0.06), color: rgba(T.danger, 0.7),
          cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
    </OverlayPortal>
  )
}
