import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Zone { id: number; name: string; x: number; y: number; w: number; h: number; color: string }
interface Layout { id: number; name: string; zones: Zone[] }

const SK = 'gs-zone-layouts'
let lid = 1, zid = 100

const PRESETS: Layout[] = [
  { id: -1, name: '50 / 50', zones: [
    { id: 1, name: '좌', x: 0, y: 0, w: 50, h: 100, color: T.teal },
    { id: 2, name: '우', x: 50, y: 0, w: 50, h: 100, color: T.gold },
  ]},
  { id: -2, name: '70 / 30', zones: [
    { id: 3, name: '메인', x: 0, y: 0, w: 70, h: 100, color: T.teal },
    { id: 4, name: '사이드', x: 70, y: 0, w: 30, h: 100, color: T.gold },
  ]},
  { id: -3, name: '3분할', zones: [
    { id: 5, name: '좌', x: 0, y: 0, w: 33.3, h: 100, color: T.teal },
    { id: 6, name: '중', x: 33.3, y: 0, w: 33.4, h: 100, color: T.gold },
    { id: 7, name: '우', x: 66.7, y: 0, w: 33.3, h: 100, color: T.success },
  ]},
  { id: -4, name: '메인 + 상하', zones: [
    { id: 8, name: '메인', x: 0, y: 0, w: 65, h: 100, color: T.teal },
    { id: 9, name: '상단', x: 65, y: 0, w: 35, h: 50, color: T.gold },
    { id: 10, name: '하단', x: 65, y: 50, w: 35, h: 50, color: T.success },
  ]},
  { id: -5, name: '4분할', zones: [
    { id: 11, name: '좌상', x: 0, y: 0, w: 50, h: 50, color: T.teal },
    { id: 12, name: '우상', x: 50, y: 0, w: 50, h: 50, color: T.gold },
    { id: 13, name: '좌하', x: 0, y: 50, w: 50, h: 50, color: T.success },
    { id: 14, name: '우하', x: 50, y: 50, w: 50, h: 50, color: T.warning },
  ]},
]

function loadLayouts(): Layout[] { try { return JSON.parse(localStorage.getItem(SK) ?? '[]') } catch { return [] } }
function saveLayouts(items: Layout[]): void { localStorage.setItem(SK, JSON.stringify(items)) }

export default function ZoneModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [custom, setCustom] = useState<Layout[]>(() => { const l = loadLayouts(); lid = Math.max(1, ...l.map(i => i.id)) + 1; return l })
  const [active, setActive] = useState<Layout | null>(null)
  const [newName, setNewName] = useState('')

  const allLayouts = useMemo(() => [...PRESETS, ...custom], [custom])

  const addLayout = useCallback(() => {
    if (!newName.trim()) return
    const layout: Layout = {
      id: lid++, name: newName.trim(),
      zones: [
        { id: zid++, name: '좌', x: 0, y: 0, w: 50, h: 100, color: T.teal },
        { id: zid++, name: '우', x: 50, y: 0, w: 50, h: 100, color: T.gold },
      ],
    }
    const next = [...custom, layout]; setCustom(next); saveLayouts(next)
    setNewName(''); setActive(layout)
  }, [newName, custom])

  const removeLayout = useCallback((id: number) => {
    const next = custom.filter(l => l.id !== id); setCustom(next); saveLayouts(next)
    if (active?.id === id) setActive(null)
  }, [custom, active])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Zone" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', gap: 20, height: '100%', overflow: 'hidden' }}>
        {/* Layout list */}
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), letterSpacing: '0.1em' }}>PRESETS</div>
          {PRESETS.map(l => (
            <button key={l.id} onClick={() => setActive(l)} style={{
              padding: '8px 10px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
              background: active?.id === l.id ? rgba(T.teal, 0.08) : rgba(T.gold, 0.03),
              border: `1px solid ${active?.id === l.id ? rgba(T.teal, 0.25) : rgba(T.gold, 0.06)}`,
              color: active?.id === l.id ? T.teal : rgba(T.fg, 0.7), fontSize: 12, fontWeight: 500,
            }}>{l.name}</button>
          ))}

          {custom.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), letterSpacing: '0.1em', marginTop: 8 }}>CUSTOM</div>
              {custom.map(l => (
                <div key={l.id} style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setActive(l)} style={{
                    flex: 1, padding: '8px 10px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                    background: active?.id === l.id ? rgba(T.teal, 0.08) : rgba(T.gold, 0.03),
                    border: `1px solid ${active?.id === l.id ? rgba(T.teal, 0.25) : rgba(T.gold, 0.06)}`,
                    color: active?.id === l.id ? T.teal : rgba(T.fg, 0.7), fontSize: 12,
                  }}>{l.name}</button>
                  <button onClick={() => removeLayout(l.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.5), cursor: 'pointer', fontSize: 11 }}>x</button>
                </div>
              ))}
            </>
          )}

          <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.08)}`, paddingTop: 10, display: 'flex', gap: 6, marginTop: 'auto' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLayout()} placeholder="새 레이아웃..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addLayout} style={{ padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: rgba(T.fg, 0.8) }}>{active.name}</div>
              <div style={{ flex: 1, position: 'relative', borderRadius: 6, border: `1px solid ${rgba(T.gold, 0.1)}`, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                {active.zones.map(z => (
                  <div key={z.id} style={{
                    position: 'absolute',
                    left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`,
                    border: `1.5px solid ${rgba(z.color, 0.27)}`,
                    background: rgba(z.color, 0.04),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: rgba(z.color, 0.8) }}>{z.name}</div>
                      <div style={{ fontSize: 9, color: rgba(T.fg, 0.35), marginTop: 2 }}>
                        {z.w.toFixed(0)}% x {z.h.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {active.zones.map(z => (
                  <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, opacity: 0.6 }} />
                    <span style={{ fontSize: 11, color: rgba(T.fg, 0.65) }}>{z.name}</span>
                    <span style={{ fontSize: 9, color: rgba(T.fg, 0.3) }}>{z.w.toFixed(0)}x{z.h.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rgba(T.fg, 0.25), fontSize: 12 }}>
              레이아웃을 선택하세요
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
