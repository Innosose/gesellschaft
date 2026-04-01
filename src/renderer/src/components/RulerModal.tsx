import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Line { id: number; x1: number; y1: number; x2: number; y2: number }

let lid = 1

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export default function RulerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [lines, setLines] = useState<Line[]>([])
  const [drawing, setDrawing] = useState(false)
  const [current, setCurrent] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [showGuides, setShowGuides] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    setDrawing(true)
    setCurrent({ x1: x, y1: y, x2: x, y2: y })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setCurrent(c => c ? { ...c, x2: e.clientX - rect.left, y2: e.clientY - rect.top } : null)
  }, [drawing, current])

  const handleMouseUp = useCallback(() => {
    if (current && dist(current.x1, current.y1, current.x2, current.y2) > 5) {
      setLines(prev => [...prev, { id: lid++, ...current }])
    }
    setDrawing(false)
    setCurrent(null)
  }, [current])

  const clearAll = useCallback(() => setLines([]), [])
  const removeLast = useCallback(() => setLines(prev => prev.slice(0, -1)), [])

  const gridSize = 50

  return (
    <Modal title="Ruler" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: `1px solid ${rgba(T.gold, 0.06)}` }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: rgba(T.fg, 0.6), cursor: 'pointer' }}>
            <input type="checkbox" checked={showGuides} onChange={e => setShowGuides(e.target.checked)} />
            격자
          </label>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: rgba(T.gold, 0.5) }}>
            측정선: {lines.length}개
          </span>
          <button onClick={removeLast} disabled={lines.length === 0} title={lines.length === 0 ? '측정선이 없습니다' : undefined} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.gold, 0.12)}`, background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.6), fontSize: 10, cursor: 'pointer' }}>실행 취소</button>
          <button onClick={clearAll} disabled={lines.length === 0} title={lines.length === 0 ? '측정선이 없습니다' : undefined} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.danger, 0.15)}`, background: rgba(T.danger, 0.04), color: rgba(T.danger, 0.6), fontSize: 10, cursor: 'pointer' }}>전체 삭제</button>
        </div>

        {/* Canvas */}
        <div ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { if (drawing) handleMouseUp() }}
          style={{ flex: 1, position: 'relative', cursor: 'crosshair', overflow: 'hidden', background: rgba(T.bg, 0.2) }}>

          {/* Grid */}
          {showGuides && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={rgba(T.gold, 0.06)} strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Tick labels */}
              {Array.from({ length: 30 }, (_, i) => (
                <text key={`x${i}`} x={i * gridSize + 2} y={10} fontSize="8" fill={rgba(T.gold, 0.2)}>{i * gridSize}</text>
              ))}
              {Array.from({ length: 20 }, (_, i) => i > 0 && (
                <text key={`y${i}`} x={2} y={i * gridSize + 10} fontSize="8" fill={rgba(T.gold, 0.2)}>{i * gridSize}</text>
              ))}
            </svg>
          )}

          {/* Drawn lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {lines.map(l => {
              const d = dist(l.x1, l.y1, l.x2, l.y2)
              const mx = (l.x1 + l.x2) / 2, my = (l.y1 + l.y2) / 2
              const dx = Math.abs(l.x2 - l.x1), dy = Math.abs(l.y2 - l.y1)
              return (
                <g key={l.id}>
                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={T.teal} strokeWidth="1.5" opacity="0.8" />
                  <circle cx={l.x1} cy={l.y1} r="3" fill={T.teal} opacity="0.6" />
                  <circle cx={l.x2} cy={l.y2} r="3" fill={T.teal} opacity="0.6" />
                  <rect x={mx - 36} y={my - 20} width="72" height="28" rx="3" fill={rgba(T.bg, 0.9)} stroke={rgba(T.teal, 0.3)} strokeWidth="0.5" />
                  <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill={T.teal}>{d.toFixed(1)}px</text>
                  <text x={mx} y={my + 5} textAnchor="middle" fontSize="7" fill={rgba(T.gold, 0.5)}>{dx.toFixed(0)} x {dy.toFixed(0)}</text>
                </g>
              )
            })}
            {/* Current drawing line */}
            {current && (
              <g>
                <line x1={current.x1} y1={current.y1} x2={current.x2} y2={current.y2} stroke={T.gold} strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
                <text x={(current.x1 + current.x2) / 2} y={(current.y1 + current.y2) / 2 - 6} textAnchor="middle" fontSize="10" fill={T.gold}>{dist(current.x1, current.y1, current.x2, current.y2).toFixed(1)}px</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </Modal>
  )
}
