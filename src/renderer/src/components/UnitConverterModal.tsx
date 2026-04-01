import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Category = '길이' | '무게' | '온도' | '속도' | '면적' | '부피' | '데이터' | '시간'

const UNITS: Record<Category, { name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[]> = {
  '길이': [
    { name: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { name: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
    { name: 'm', toBase: v => v, fromBase: v => v },
    { name: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { name: 'in', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    { name: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { name: 'yd', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    { name: 'mi', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
  ],
  '무게': [
    { name: 'mg', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { name: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { name: 'kg', toBase: v => v, fromBase: v => v },
    { name: 't', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { name: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
    { name: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
  ],
  '온도': [
    { name: '°C', toBase: v => v, fromBase: v => v },
    { name: '°F', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    { name: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  ],
  '속도': [
    { name: 'm/s', toBase: v => v, fromBase: v => v },
    { name: 'km/h', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
    { name: 'mph', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
    { name: 'knot', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
  ],
  '면적': [
    { name: 'mm²', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { name: 'cm²', toBase: v => v / 1e4, fromBase: v => v * 1e4 },
    { name: 'm²', toBase: v => v, fromBase: v => v },
    { name: 'km²', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    { name: '평', toBase: v => v * 3.305785, fromBase: v => v / 3.305785 },
    { name: 'acre', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
    { name: 'ha', toBase: v => v * 1e4, fromBase: v => v / 1e4 },
  ],
  '부피': [
    { name: 'mL', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { name: 'L', toBase: v => v, fromBase: v => v },
    { name: 'm³', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { name: 'gal (US)', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    { name: 'fl oz', toBase: v => v * 0.0295735, fromBase: v => v / 0.0295735 },
    { name: 'cup', toBase: v => v * 0.236588, fromBase: v => v / 0.236588 },
  ],
  '데이터': [
    { name: 'B', toBase: v => v, fromBase: v => v },
    { name: 'KB', toBase: v => v * 1024, fromBase: v => v / 1024 },
    { name: 'MB', toBase: v => v * 1048576, fromBase: v => v / 1048576 },
    { name: 'GB', toBase: v => v * 1073741824, fromBase: v => v / 1073741824 },
    { name: 'TB', toBase: v => v * 1099511627776, fromBase: v => v / 1099511627776 },
  ],
  '시간': [
    { name: 'ms', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { name: '초', toBase: v => v, fromBase: v => v },
    { name: '분', toBase: v => v * 60, fromBase: v => v / 60 },
    { name: '시간', toBase: v => v * 3600, fromBase: v => v / 3600 },
    { name: '일', toBase: v => v * 86400, fromBase: v => v / 86400 },
    { name: '주', toBase: v => v * 604800, fromBase: v => v / 604800 },
    { name: '년', toBase: v => v * 31536000, fromBase: v => v / 31536000 },
  ],
}

const CATEGORIES = Object.keys(UNITS) as Category[]

export default function UnitConverterModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [cat, setCat] = useState<Category>('길이')
  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(2)
  const [value, setValue] = useState('1')

  const units = UNITS[cat]
  const result = useMemo(() => {
    const v = parseFloat(value)
    if (isNaN(v)) return ''
    const base = units[fromIdx].toBase(v)
    return units[toIdx].fromBase(base).toPrecision(10).replace(/\.?0+$/, '')
  }, [value, units, fromIdx, toIdx])

  const swap = () => { setFromIdx(toIdx); setToIdx(fromIdx) }

  return (
    <Modal title="단위 변환기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCat(c); setFromIdx(0); setToIdx(Math.min(2, UNITS[c].length - 1)); setValue('1') }} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: cat === c ? 'rgba(123,143,255,0.2)' : 'transparent',
              color: cat === c ? T.teal : rgba(T.fg, 0.45),
            }}>{c}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>변환 전</label>
            <select className="win-input" value={fromIdx} onChange={e => setFromIdx(Number(e.target.value))} style={{ width: '100%' }}>
              {units.map((u, i) => <option key={i} value={i}>{u.name}</option>)}
            </select>
          </div>
          <button onClick={swap} style={{ marginTop: 16, background: 'none', border: 'none', color: T.teal, cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>⇄</button>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>변환 후</label>
            <select className="win-input" value={toIdx} onChange={e => setToIdx(Number(e.target.value))} style={{ width: '100%' }}>
              {units.map((u, i) => <option key={i} value={i}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>값</label>
            <input className="win-input" type="number" value={value} onChange={e => setValue(e.target.value)} style={{ width: '100%', fontSize: 16 }} />
          </div>
        </div>

        {/* Result */}
        <div style={{ padding: 20, borderRadius: 12, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--win-text-muted)', marginBottom: 8 }}>{value || '0'} {units[fromIdx].name} =</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.teal }}>{result || '0'}</div>
          <div style={{ fontSize: 14, color: 'var(--win-text-sub)', marginTop: 4 }}>{units[toIdx].name}</div>
        </div>

        {/* All conversions */}
        <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>모든 단위 변환</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {units.map((u, i) => {
            if (i === fromIdx) return null
            const v = parseFloat(value)
            const r = isNaN(v) ? '0' : u.fromBase(units[fromIdx].toBase(v)).toPrecision(8).replace(/\.?0+$/, '')
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--win-surface-2)', borderRadius: 6, border: '1px solid var(--win-border)' }}>
                <span style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>{u.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)' }}>{r}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
