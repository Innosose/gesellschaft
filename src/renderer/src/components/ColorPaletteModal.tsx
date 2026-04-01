import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const SK = 'gs-color-palettes'

interface SavedPalette { id: number; colors: string[]; name: string }

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function loadPalettes(): SavedPalette[] { try { return JSON.parse(localStorage.getItem(SK) || '[]') } catch { return [] } }
function savePalettes(p: SavedPalette[]) { localStorage.setItem(SK, JSON.stringify(p)) }

type Scheme = 'complementary' | 'analogous' | 'triadic' | 'split'

export default function ColorPaletteModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [h, setH] = useState(220)
  const [s, setS] = useState(70)
  const [l, setL] = useState(55)
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [palettes, setPalettes] = useState<SavedPalette[]>(loadPalettes)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { savePalettes(palettes) }, [palettes])

  const rgb = useMemo(() => hslToRgb(h, s, l), [h, s, l])
  const hex = useMemo(() => rgbToHex(...rgb), [rgb])

  const schemeColors = useMemo(() => {
    const make = (hue: number) => {
      const [r, g, b] = hslToRgb(((hue % 360) + 360) % 360, s, l)
      return rgbToHex(r, g, b)
    }
    switch (scheme) {
      case 'complementary': return [make(h), make(h + 180)]
      case 'analogous': return [make(h - 30), make(h), make(h + 30)]
      case 'triadic': return [make(h), make(h + 120), make(h + 240)]
      case 'split': return [make(h), make(h + 150), make(h + 210)]
    }
  }, [h, s, l, scheme])

  const copy = useCallback((val: string) => {
    navigator.clipboard.writeText(val).then(() => { setCopied(val); setTimeout(() => setCopied(null), 1200) }).catch(() => {})
  }, [])

  const savePalette = useCallback(() => {
    const p: SavedPalette = { id: Date.now(), colors: schemeColors, name: `${scheme} ${hex}` }
    setPalettes(prev => [...prev, p])
  }, [schemeColors, scheme, hex])

  const deletePalette = useCallback((id: number) => {
    setPalettes(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <Modal title="색상 팔레트" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* color preview */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: hex, border: `2px solid ${rgba(T.fg, 0.2)}`, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              {[
                { label: 'HEX', value: hex },
                { label: 'RGB', value: `rgb(${rgb.join(', ')})` },
                { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
              ].map(c => (
                <button key={c.label} onClick={() => copy(c.value)} style={{
                  padding: '3px 8px', borderRadius: 6, border: '1px solid var(--win-border)', background: 'var(--win-surface-2)',
                  cursor: 'pointer', fontSize: 11, color: 'var(--win-text)', fontFamily: 'monospace',
                }}>
                  <span style={{ color: 'var(--win-text-muted)' }}>{c.label}: </span>
                  {c.value}
                  {copied === c.value && <span style={{ color: T.teal, marginLeft: 4 }}>\u2713</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'H (색상)', value: h, set: setH, min: 0, max: 359, bg: `linear-gradient(to right, hsl(0,${s}%,${l}%), hsl(60,${s}%,${l}%), hsl(120,${s}%,${l}%), hsl(180,${s}%,${l}%), hsl(240,${s}%,${l}%), hsl(300,${s}%,${l}%), hsl(359,${s}%,${l}%))` },
            { label: 'S (채도)', value: s, set: setS, min: 0, max: 100, bg: `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))` },
            { label: 'L (명도)', value: l, set: setL, min: 0, max: 100, bg: `linear-gradient(to right, hsl(${h},${s}%,0%), hsl(${h},${s}%,50%), hsl(${h},${s}%,100%))` },
          ].map(sl => (
            <div key={sl.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)', width: 60 }}>{sl.label}</span>
              <input type="range" min={sl.min} max={sl.max} value={sl.value} onChange={e => sl.set(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--win-text)', fontFamily: 'monospace', width: 30, textAlign: 'right' }}>{sl.value}</span>
            </div>
          ))}
        </div>

        {/* scheme */}
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {([
              { id: 'complementary' as Scheme, l: '보색' }, { id: 'analogous' as Scheme, l: '유사색' },
              { id: 'triadic' as Scheme, l: '삼등분' }, { id: 'split' as Scheme, l: '분할보색' },
            ]).map(t => (
              <button key={t.id} onClick={() => setScheme(t.id)} style={{
                padding: '4px 10px', borderRadius: 6, border: scheme === t.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--win-border)',
                background: scheme === t.id ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--win-text)',
              }}>{t.l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {schemeColors.map((c, i) => (
              <div key={i} onClick={() => copy(c)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ height: 40, borderRadius: 8, background: c, border: `1px solid ${rgba(T.fg, 0.15)}` }} />
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)', textAlign: 'center', marginTop: 2, fontFamily: 'monospace' }}>{c}</div>
              </div>
            ))}
          </div>
          <button className="win-btn-ghost" onClick={savePalette} style={{ fontSize: 11, marginTop: 6 }}>팔레트 저장</button>
        </div>

        {/* saved palettes */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>저장된 팔레트</div>
          {palettes.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 12, padding: 16 }}>저장된 팔레트 없음</div>}
          {palettes.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${rgba(T.fg, 0.05)}` }}>
              <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                {p.colors.map((c, i) => (
                  <div key={i} onClick={() => copy(c)} style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: `1px solid ${rgba(T.fg, 0.15)}` }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{p.name}</span>
              <button onClick={() => deletePalette(p.id)} style={{ background: 'none', border: 'none', color: rgba(T.fg, 0.3), cursor: 'pointer', fontSize: 10 }}>\u2715</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
