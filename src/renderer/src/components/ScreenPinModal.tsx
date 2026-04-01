import React, { useState, useEffect, useCallback, useRef } from 'react'
import { T, rgba } from '../utils/theme'
import OverlayPortal from '../utils/OverlayPortal'

interface Pin {
  id: string
  text: string
  color: string
  x: number
  y: number
}

const STORAGE_KEY = 'gs-screen-pins'
const COLORS = [T.gold, T.teal, T.danger, T.success, T.warning]
const MAX_PINS = 10

function loadPins(): Pin[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function savePins(pins: Pin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins))
}

function genId(): string {
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function PinNote({ pin, onUpdate, onDelete }: {
  pin: Pin; onUpdate: (p: Partial<Pin>) => void; onDelete: () => void
}): React.ReactElement {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const onMouseDown = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pin.x, origY: pin.y }
    const onMove = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      const x = Math.max(0, Math.min(window.innerWidth - 140, dragRef.current.origX + dx))
      const y = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy))
      onUpdate({ x, y })
    }
    const onUp = (): void => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed', left: pin.x, top: pin.y,
        width: 140, minHeight: 60, borderRadius: 6, padding: 6,
        background: rgba(T.bg, 0.95), border: `1.5px solid ${pin.color}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)', cursor: 'grab', zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onUpdate({ color: c })}
              style={{
                width: 10, height: 10, borderRadius: '50%', background: c, cursor: 'pointer',
                border: c === pin.color ? '1.5px solid #fff' : '1px solid transparent',
              }} />
          ))}
        </div>
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>
          ✕
        </button>
      </div>
      <textarea
        value={pin.text}
        onChange={e => onUpdate({ text: e.target.value })}
        placeholder="..."
        style={{
          width: '100%', minHeight: 36, background: 'transparent', border: 'none',
          color: pin.color, fontSize: 11, resize: 'vertical', outline: 'none',
          fontFamily: 'inherit', lineHeight: 1.4,
        }}
      />
    </div>
  )
}

export default function ScreenPinModal({ onClose }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [pins, setPins] = useState<Pin[]>(loadPins)
  const [placing, setPlacing] = useState(false)

  useEffect(() => { savePins(pins) }, [pins])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { onClose(); e.stopPropagation() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  const handleScreenClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-toolbar]')) return
    if ((e.target as HTMLElement).closest('[data-pin]')) return
    if (!placing) return
    if (pins.length >= MAX_PINS) return
    const pin: Pin = {
      id: genId(), text: '', color: COLORS[pins.length % COLORS.length],
      x: e.clientX - 70, y: e.clientY - 30,
    }
    setPins(prev => [...prev, pin])
    setPlacing(false)
  }, [placing, pins])

  const updatePin = useCallback((id: string, patch: Partial<Pin>) => {
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }, [])

  const deletePin = useCallback((id: string) => {
    setPins(prev => prev.filter(p => p.id !== id))
  }, [])

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
    border: `1px solid ${rgba(T.gold, 0.12)}`,
    background: active ? rgba(T.teal, 0.12) : rgba(T.gold, 0.04),
    color: active ? T.teal : rgba(T.fg, 0.6),
    fontWeight: active ? 600 : 400,
  })

  return (
    <OverlayPortal>
      {/* Click area for placing pins */}
      <div
        onClick={handleScreenClick}
        style={{
          position: 'fixed', inset: 0,
          pointerEvents: placing ? 'auto' : 'none',
          cursor: placing ? 'crosshair' : 'default',
          zIndex: 1,
        }}
      />

      {/* Pins on screen */}
      {pins.map(pin => (
        <div key={pin.id} data-pin>
          <PinNote
            pin={pin}
            onUpdate={patch => updatePin(pin.id, patch)}
            onDelete={() => deletePin(pin.id)}
          />
        </div>
      ))}

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
        <button
          onClick={() => setPlacing(!placing)}
          disabled={pins.length >= MAX_PINS}
          style={btnStyle(placing)}
          title={placing ? '배치 취소' : '핀 추가 (클릭으로 배치)'}
        >
          {placing ? '배치 중...' : `+ (${pins.length}/${MAX_PINS})`}
        </button>
        <button
          onClick={() => setPins([])}
          disabled={pins.length === 0}
          style={{ ...btnStyle(), borderColor: rgba(T.danger, 0.15), color: rgba(T.danger, 0.6) }}
          title="전체 삭제"
        >
          전체 삭제
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
