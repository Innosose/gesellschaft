import React, { useState, useEffect, useCallback } from 'react'
import { T, rgba } from '../utils/theme'
import OverlayPortal from '../utils/OverlayPortal'

export default function SpotlightModal({ onClose }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [radius, setRadius] = useState(120)
  const [dimOpacity, setDimOpacity] = useState(0.6)
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const [pinned, setPinned] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const step = 10
    if (e.key === 'ArrowLeft') setPos(p => ({ ...p, x: p.x - step }))
    else if (e.key === 'ArrowRight') setPos(p => ({ ...p, x: p.x + step }))
    else if (e.key === 'ArrowUp') setPos(p => ({ ...p, y: p.y - step }))
    else if (e.key === 'ArrowDown') setPos(p => ({ ...p, y: p.y + step }))
    else if (e.key === '+' || e.key === '=') setRadius(r => Math.min(r + 10, 300))
    else if (e.key === '-') setRadius(r => Math.max(r - 10, 50))
    else if (e.key === 'Escape') { onClose(); e.stopPropagation() }
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!pinned) {
      setPos({ x: e.clientX, y: e.clientY })
    }
  }, [pinned])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-toolbar]')) return
    setPinned(p => !p)
  }, [])

  const spotSize = radius * 2
  const boxShadowCircle = `0 0 0 9999px rgba(0,0,0,${dimOpacity})`

  return (
    <OverlayPortal>
      {/* Spotlight overlay */}
      <div
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'auto',
          cursor: pinned ? 'pointer' : 'none', zIndex: 1,
        }}
      >
        <div style={{
          position: 'absolute',
          left: pos.x - radius, top: pos.y - radius,
          width: spotSize, height: spotSize,
          borderRadius: '50%',
          boxShadow: boxShadowCircle,
        }} />
      </div>

      {/* Floating toolbar at bottom-center */}
      <div data-toolbar style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
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
        <label style={{ fontSize: 10, color: rgba(T.fg, 0.5), display: 'flex', alignItems: 'center', gap: 4 }}>
          반지름
          <input type="range" min={50} max={300} value={radius} onChange={e => setRadius(+e.target.value)} style={{ width: 70 }} />
          <span style={{ color: T.gold, minWidth: 28 }}>{radius}px</span>
        </label>
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        <label style={{ fontSize: 10, color: rgba(T.fg, 0.5), display: 'flex', alignItems: 'center', gap: 4 }}>
          어둡기
          <input type="range" min={30} max={90} value={dimOpacity * 100} onChange={e => setDimOpacity(+e.target.value / 100)} style={{ width: 70 }} />
          <span style={{ color: T.gold, minWidth: 28 }}>{Math.round(dimOpacity * 100)}%</span>
        </label>
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        <span style={{ fontSize: 9, color: pinned ? T.teal : rgba(T.fg, 0.4) }}>
          {pinned ? 'PIN' : 'FOLLOW'}
        </span>
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
