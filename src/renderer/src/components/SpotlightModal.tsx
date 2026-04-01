import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

export default function SpotlightModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [radius, setRadius] = useState(120)
  const [dimOpacity, setDimOpacity] = useState(0.6)
  const [rectMode, setRectMode] = useState(false)
  const [pos, setPos] = useState({ x: 300, y: 300 })
  const [pinned, setPinned] = useState(false)
  const [active, setActive] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!active) return
    const step = 10
    if (e.key === 'ArrowLeft') setPos(p => ({ ...p, x: p.x - step }))
    else if (e.key === 'ArrowRight') setPos(p => ({ ...p, x: p.x + step }))
    else if (e.key === 'ArrowUp') setPos(p => ({ ...p, y: p.y - step }))
    else if (e.key === 'ArrowDown') setPos(p => ({ ...p, y: p.y + step }))
    else if (e.key === '+' || e.key === '=') setRadius(r => Math.min(r + 10, 300))
    else if (e.key === '-') setRadius(r => Math.max(r - 10, 50))
    else if (e.key === 'Escape') { setActive(false); setPinned(false) }
  }, [active])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!pinned && active) {
      setPos({ x: e.clientX, y: e.clientY })
    }
  }, [pinned, active])

  const handleClick = useCallback(() => {
    if (active) setPinned(p => !p)
  }, [active])

  const spotlightStyle: React.CSSProperties = active ? {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    zIndex: 99999, cursor: pinned ? 'pointer' : 'none',
    ...(rectMode
      ? {
          background: `linear-gradient(rgba(0,0,0,${dimOpacity}),rgba(0,0,0,${dimOpacity}))`,
          WebkitMaskImage: `linear-gradient(#000,#000), linear-gradient(#000,#000)`,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }
      : {})
  } : {}

  const boxShadowCircle = `0 0 0 9999px rgba(0,0,0,${dimOpacity})`
  const spotSize = radius * 2

  return (
    <Modal title="스포트라이트" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className={active ? 'win-btn-danger' : 'win-btn-primary'}
            style={{ fontSize: 12, padding: '4px 14px' }}
            onClick={() => { setActive(!active); setPinned(false) }}
          >
            {active ? '스포트라이트 종료' : '스포트라이트 시작'}
          </button>
          <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={rectMode} onChange={e => setRectMode(e.target.checked)} />
            사각형 모드
          </label>
          {active && (
            <span style={{ fontSize: 10, color: T.teal }}>
              {pinned ? '📌 고정됨 — 클릭하면 해제' : '마우스를 따라갑니다 — 클릭하면 고정'}
            </span>
          )}
        </div>

        <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          반지름
          <input type="range" min={50} max={300} value={radius} onChange={e => setRadius(+e.target.value)}
            style={{ flex: 1 }} />
          <span style={{ color: T.gold, minWidth: 30 }}>{radius}px</span>
        </label>

        <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          어두움
          <input type="range" min={30} max={90} value={dimOpacity * 100} onChange={e => setDimOpacity(+e.target.value / 100)}
            style={{ flex: 1 }} />
          <span style={{ color: T.gold, minWidth: 30 }}>{Math.round(dimOpacity * 100)}%</span>
        </label>

        <div style={{ fontSize: 10, color: 'var(--win-text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: T.gold }}>단축키:</strong> 방향키 이동 · +/- 크기 조절 · Esc 종료 · 클릭 고정/해제
        </div>

        {/* Preview */}
        <div style={{
          position: 'relative', height: 180, borderRadius: 8, overflow: 'hidden',
          background: T.surface, border: `1px solid ${rgba(T.gold, 0.2)}`
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 60, height: 60, borderRadius: rectMode ? 4 : '50%',
            transform: 'translate(-50%,-50%)',
            boxShadow: `0 0 0 9999px rgba(0,0,0,${dimOpacity})`,
          }} />
          <div style={{ position: 'absolute', bottom: 6, width: '100%', textAlign: 'center', fontSize: 10, color: T.gold }}>
            미리보기
          </div>
        </div>
      </div>

      {/* Actual spotlight overlay */}
      {active && (
        <div
          ref={overlayRef}
          style={spotlightStyle}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {rectMode ? (
            <>
              {/* Top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, pos.y - radius), background: `rgba(0,0,0,${dimOpacity})` }} />
              {/* Bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: pos.y + radius, background: `rgba(0,0,0,${dimOpacity})` }} />
              {/* Left */}
              <div style={{ position: 'absolute', top: pos.y - radius, left: 0, width: Math.max(0, pos.x - radius), height: spotSize, background: `rgba(0,0,0,${dimOpacity})` }} />
              {/* Right */}
              <div style={{ position: 'absolute', top: pos.y - radius, right: 0, left: pos.x + radius, height: spotSize, background: `rgba(0,0,0,${dimOpacity})` }} />
            </>
          ) : (
            <div style={{
              position: 'absolute',
              left: pos.x - radius, top: pos.y - radius,
              width: spotSize, height: spotSize,
              borderRadius: '50%',
              boxShadow: boxShadowCircle,
            }} />
          )}
        </div>
      )}
    </Modal>
  )
}
