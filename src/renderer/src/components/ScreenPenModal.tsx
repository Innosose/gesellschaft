import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  size: number
  eraser: boolean
}

const COLORS = [T.danger, T.teal, T.gold, T.success, T.fg]

export default function ScreenPenModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
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
    const parent = canvas.parentElement
    if (!parent) return
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight
    redraw()
  }, [redraw])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    drawing.current = true
    currentStroke.current = { points: [getPos(e)], color, size: penSize, eraser }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current || !currentStroke.current) return
    currentStroke.current.points.push(getPos(e))
    redraw()
  }

  const onMouseUp = () => {
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      setStrokes(prev => {
        const next = [...prev, currentStroke.current!]
        return next.length > 20 ? next.slice(-20) : next
      })
    }
    currentStroke.current = null
    drawing.current = false
  }

  const undo = () => setStrokes(prev => prev.slice(0, -1))
  const clearAll = () => setStrokes([])

  return (
    <Modal title="화면 펜" onClose={onClose} wide asPanel={asPanel}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); setEraser(false) }}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c,
              border: color === c && !eraser ? `2px solid ${T.gold}` : '2px solid transparent',
              cursor: 'pointer'
            }}
          />
        ))}
        <div style={{ width: 1, height: 20, background: rgba(T.gold, 0.3), margin: '0 4px' }} />
        <button
          className={eraser ? 'win-btn-primary' : 'win-btn-secondary'}
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => setEraser(!eraser)}
        >지우개</button>
        <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          굵기
          <input type="range" min={2} max={10} value={penSize} onChange={e => setPenSize(+e.target.value)}
            style={{ width: 60 }} />
          <span style={{ color: T.gold, minWidth: 16 }}>{penSize}</span>
        </label>
        <div style={{ width: 1, height: 20, background: rgba(T.gold, 0.3), margin: '0 4px' }} />
        <button className="win-btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={undo}>
          되돌리기
        </button>
        <button className="win-btn-danger" style={{ fontSize: 11, padding: '2px 8px' }} onClick={clearAll}>
          전체 지우기
        </button>
        <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={dimBg} onChange={e => setDimBg(e.target.checked)} />
          배경 어둡게
        </label>
      </div>
      {/* Canvas area */}
      <div
        style={{
          position: 'relative', flex: 1, minHeight: 350, borderRadius: 8,
          background: dimBg ? 'rgba(0,0,0,0.3)' : 'transparent',
          border: `1px solid ${rgba(T.gold, 0.2)}`, overflow: 'hidden',
          cursor: eraser ? 'cell' : 'crosshair'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
      <p style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 4, textAlign: 'center' }}>
        마우스로 그리세요 · 최대 20획 되돌리기 가능
      </p>
    </Modal>
  )
}
