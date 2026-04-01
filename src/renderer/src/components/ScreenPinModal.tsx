import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Pin {
  id: string
  text: string
  color: string
  xPct: number
  yPct: number
}

const STORAGE_KEY = 'gs-screen-pins'
const COLORS = [T.gold, T.teal, T.danger, T.success, T.warning]
const MAX_PINS = 10

function loadPins(): Pin[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function savePins(pins: Pin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins))
}

function genId(): string {
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// Draggable pin displayed inside the preview area
function PinNote({ pin, onUpdate, onDelete, containerRect }: {
  pin: Pin; onUpdate: (p: Partial<Pin>) => void; onDelete: () => void; containerRect: DOMRect | null
}) {
  const dragRef = useRef<{ startX: number; startY: number; origXPct: number; origYPct: number } | null>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origXPct: pin.xPct, origYPct: pin.yPct }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !containerRect) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      const xPct = Math.max(0, Math.min(85, dragRef.current.origXPct + (dx / containerRect.width) * 100))
      const yPct = Math.max(0, Math.min(85, dragRef.current.origYPct + (dy / containerRect.height) * 100))
      onUpdate({ xPct, yPct })
    }
    const onUp = () => {
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
        position: 'absolute', left: `${pin.xPct}%`, top: `${pin.yPct}%`,
        width: 140, minHeight: 60, borderRadius: 6, padding: 6,
        background: T.surface, border: `1.5px solid ${pin.color}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.4)`, cursor: 'grab', zIndex: 10
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onUpdate({ color: c })}
              style={{
                width: 10, height: 10, borderRadius: '50%', background: c, cursor: 'pointer',
                border: c === pin.color ? '1.5px solid #fff' : '1px solid transparent'
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
        placeholder="메모..."
        style={{
          width: '100%', minHeight: 36, background: 'transparent', border: 'none',
          color: pin.color, fontSize: 11, resize: 'vertical', outline: 'none',
          fontFamily: 'inherit', lineHeight: 1.4
        }}
      />
    </div>
  )
}

export default function ScreenPinModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [pins, setPins] = useState<Pin[]>(loadPins)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  useEffect(() => { savePins(pins) }, [pins])

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setContainerRect(containerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const addPin = useCallback(() => {
    if (pins.length >= MAX_PINS) return
    const pin: Pin = {
      id: genId(), text: '', color: COLORS[pins.length % COLORS.length],
      xPct: 10 + Math.random() * 60, yPct: 10 + Math.random() * 60
    }
    setPins(prev => [...prev, pin])
  }, [pins.length])

  const updatePin = useCallback((id: string, patch: Partial<Pin>) => {
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }, [])

  const deletePin = useCallback((id: string) => {
    setPins(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <Modal title="화면 핀" onClose={onClose} wide asPanel={asPanel}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button className="win-btn-primary" style={{ fontSize: 12, padding: '4px 14px' }}
            onClick={addPin} disabled={pins.length >= MAX_PINS}>
            + 핀 추가 ({pins.length}/{MAX_PINS})
          </button>
          {pins.length >= MAX_PINS && (
            <span style={{ fontSize: 10, color: T.danger }}>최대 {MAX_PINS}개</span>
          )}
          <button className="win-btn-danger" style={{ fontSize: 11, padding: '2px 10px', marginLeft: 'auto' }}
            onClick={() => setPins([])}>
            전체 삭제
          </button>
        </div>

        {/* Pin area */}
        <div ref={containerRef} style={{
          position: 'relative', minHeight: 350, borderRadius: 8,
          background: 'rgba(22,20,14,0.6)', border: `1px solid ${rgba(T.gold, 0.15)}`,
          overflow: 'hidden'
        }}>
          {pins.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--win-text-muted)', fontSize: 12
            }}>
              핀을 추가하여 메모를 남기세요
            </div>
          )}
          {pins.map(pin => (
            <PinNote
              key={pin.id}
              pin={pin}
              onUpdate={patch => updatePin(pin.id, patch)}
              onDelete={() => deletePin(pin.id)}
              containerRect={containerRect}
            />
          ))}
        </div>

        <p style={{ fontSize: 10, color: 'var(--win-text-muted)', textAlign: 'center' }}>
          핀을 드래그하여 위치를 변경하세요 · 위치는 자동 저장됩니다
        </p>
      </div>
    </Modal>
  )
}
