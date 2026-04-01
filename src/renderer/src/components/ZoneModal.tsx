import React, { useState, useEffect } from 'react'
import OverlayPortal from '../utils/OverlayPortal'
import { T, rgba } from '../utils/theme'

interface Zone { x: string; y: string; w: string; h: string }

const LAYOUTS: { label: string; zones: Zone[] }[] = [
  { label: '1:1', zones: [
    { x: '0%', y: '0%', w: '50%', h: '100%' },
    { x: '50%', y: '0%', w: '50%', h: '100%' },
  ]},
  { label: '1:1:1', zones: [
    { x: '0%', y: '0%', w: '33.33%', h: '100%' },
    { x: '33.33%', y: '0%', w: '33.33%', h: '100%' },
    { x: '66.66%', y: '0%', w: '33.34%', h: '100%' },
  ]},
  { label: '2:1', zones: [
    { x: '0%', y: '0%', w: '66.66%', h: '100%' },
    { x: '66.66%', y: '0%', w: '33.34%', h: '100%' },
  ]},
  { label: '4분할', zones: [
    { x: '0%', y: '0%', w: '50%', h: '50%' },
    { x: '50%', y: '0%', w: '50%', h: '50%' },
    { x: '0%', y: '50%', w: '50%', h: '50%' },
    { x: '50%', y: '50%', w: '50%', h: '50%' },
  ]},
  { label: '메인+사이드', zones: [
    { x: '0%', y: '0%', w: '70%', h: '100%' },
    { x: '70%', y: '0%', w: '30%', h: '50%' },
    { x: '70%', y: '50%', w: '30%', h: '50%' },
  ]},
  { label: '3행', zones: [
    { x: '0%', y: '0%', w: '100%', h: '33.33%' },
    { x: '0%', y: '33.33%', w: '100%', h: '33.33%' },
    { x: '0%', y: '66.66%', w: '100%', h: '33.34%' },
  ]},
]

const ZONE_COLORS = [T.teal, T.gold, T.success, T.warning, T.danger, T.fg]

export default function ZoneModal({ onClose }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [layoutIdx, setLayoutIdx] = useState(0)
  const [selectedZone, setSelectedZone] = useState<number | null>(null)
  const layout = LAYOUTS[layoutIdx]

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { onClose(); e.stopPropagation() }
      if (e.key === 'ArrowRight') setLayoutIdx(i => (i + 1) % LAYOUTS.length)
      if (e.key === 'ArrowLeft') setLayoutIdx(i => (i - 1 + LAYOUTS.length) % LAYOUTS.length)
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onClose])

  // Reset selection when layout changes
  useEffect(() => { setSelectedZone(null) }, [layoutIdx])

  const toolbarStyle: React.CSSProperties = {
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
  }

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
    border: `1px solid ${rgba(T.gold, 0.12)}`,
    background: active ? rgba(T.teal, 0.12) : rgba(T.gold, 0.04),
    color: active ? T.teal : rgba(T.fg, 0.6),
    fontWeight: active ? 600 : 400,
  })

  return (
    <OverlayPortal>
      {/* Dim background */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Zone grid overlay */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-toolbar]')) return
        }}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'auto', zIndex: 1 }}
      >
        {layout.zones.map((zone, i) => {
          const zoneColor = ZONE_COLORS[i % ZONE_COLORS.length]
          const isSelected = selectedZone === i
          return (
            <div
              key={`${layoutIdx}-${i}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-toolbar]')) return
                setSelectedZone(prev => prev === i ? null : i)
              }}
              style={{
                position: 'absolute',
                left: zone.x, top: zone.y, width: zone.w, height: zone.h,
                border: isSelected ? `3px solid ${zoneColor}` : `2px solid ${rgba(zoneColor, 0.35)}`,
                background: isSelected ? rgba(zoneColor, 0.12) : rgba(zoneColor, 0.04),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  ;(e.currentTarget as HTMLElement).style.background = rgba(zoneColor, 0.08)
                  ;(e.currentTarget as HTMLElement).style.borderColor = rgba(zoneColor, 0.6)
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  ;(e.currentTarget as HTMLElement).style.background = rgba(zoneColor, 0.04)
                  ;(e.currentTarget as HTMLElement).style.borderColor = rgba(zoneColor, 0.35)
                }
              }}
            >
              <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: isSelected ? zoneColor : rgba(zoneColor, 0.6),
                  textShadow: isSelected ? `0 0 12px ${rgba(zoneColor, 0.3)}` : 'none',
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 10, color: rgba(T.fg, 0.35), marginTop: 2 }}>
                  {zone.w} x {zone.h}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating toolbar */}
      <div data-toolbar style={toolbarStyle}>
        <span style={{ fontSize: 10, color: rgba(T.gold, 0.5), fontWeight: 600 }}>Zone</span>
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        {LAYOUTS.map((l, i) => (
          <button
            key={l.label}
            onClick={() => setLayoutIdx(i)}
            style={btnStyle(layoutIdx === i)}
          >
            {l.label}
          </button>
        ))}
        <div style={{ width: 1, height: 18, background: rgba(T.gold, 0.15) }} />
        <span style={{ fontSize: 9, color: rgba(T.fg, 0.3) }}>← → 전환</span>
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
