import React, { useState, useCallback, useEffect } from 'react'
import { T, rgba } from '../utils/theme'
import OverlayPortal from '../utils/OverlayPortal'

interface Line { id: number; x1: number; y1: number; x2: number; y2: number }

let lid = 1

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export default function RulerModal({ onClose }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [lines, setLines] = useState<Line[]>([])
  const [drawing, setDrawing] = useState(false)
  const [current, setCurrent] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [showGuides, setShowGuides] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // ignore clicks on the toolbar
    if ((e.target as HTMLElement).closest('[data-toolbar]')) return
    setDrawing(true)
    setCurrent({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !current) return
    setCurrent(c => c ? { ...c, x2: e.clientX, y2: e.clientY } : null)
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
      {/* Full-screen canvas */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (drawing) handleMouseUp() }}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'auto', cursor: 'crosshair', zIndex: 1 }}
      >
        {/* Optional grid */}
        {showGuides && (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="ruler-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={rgba(T.gold, 0.06)} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ruler-grid)" />
            {Array.from({ length: Math.ceil(window.innerWidth / gridSize) }, (_, i) => (
              <text key={`x${i}`} x={i * gridSize + 2} y={10} fontSize="8" fill={rgba(T.gold, 0.2)}>{i * gridSize}</text>
            ))}
            {Array.from({ length: Math.ceil(window.innerHeight / gridSize) }, (_, i) => i > 0 && (
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
          {current && (
            <g>
              <line x1={current.x1} y1={current.y1} x2={current.x2} y2={current.y2} stroke={T.gold} strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
              <text x={(current.x1 + current.x2) / 2} y={(current.y1 + current.y2) / 2 - 6} textAnchor="middle" fontSize="10" fill={T.gold}>
                {dist(current.x1, current.y1, current.x2, current.y2).toFixed(1)}px
              </text>
            </g>
          )}
        </svg>
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
        <span style={{ fontSize: 10, color: rgba(T.gold, 0.5) }}>
          {lines.length}
        </span>
        <button onClick={removeLast} disabled={lines.length === 0} style={btnStyle()} title="실행 취소">
          실행 취소
        </button>
        <button onClick={clearAll} disabled={lines.length === 0} style={{ ...btnStyle(), borderColor: rgba(T.danger, 0.15), color: rgba(T.danger, 0.6) }} title="전체 삭제">
          전체 삭제
        </button>
        <button onClick={() => setShowGuides(g => !g)} style={btnStyle(showGuides)} title="격자 표시">
          격자
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
