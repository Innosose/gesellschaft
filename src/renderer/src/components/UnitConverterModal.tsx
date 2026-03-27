import React from 'react'
import { Modal } from './SearchModal'

type Category = 'length' | 'weight' | 'area' | 'temperature' | 'filesize'

interface Unit {
  id: string
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const UNITS: Record<Category, Unit[]> = {
  length: [
    { id: 'mm', label: 'mm (밀리미터)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { id: 'cm', label: 'cm (센티미터)', toBase: v => v / 100, fromBase: v => v * 100 },
    { id: 'm', label: 'm (미터)', toBase: v => v, fromBase: v => v },
    { id: 'km', label: 'km (킬로미터)', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { id: 'inch', label: 'inch (인치)', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    { id: 'feet', label: 'feet (피트)', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { id: 'yard', label: 'yard (야드)', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    { id: 'mile', label: 'mile (마일)', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
  ],
  weight: [
    { id: 'mg', label: 'mg (밀리그램)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { id: 'g', label: 'g (그램)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { id: 'kg', label: 'kg (킬로그램)', toBase: v => v, fromBase: v => v },
    { id: 't', label: 't (톤)', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { id: 'lb', label: 'lb (파운드)', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
    { id: 'oz', label: 'oz (온스)', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
  ],
  area: [
    { id: 'mm2', label: 'mm² (제곱밀리미터)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { id: 'cm2', label: 'cm² (제곱센티미터)', toBase: v => v / 10000, fromBase: v => v * 10000 },
    { id: 'm2', label: 'm² (제곱미터)', toBase: v => v, fromBase: v => v },
    { id: 'km2', label: 'km² (제곱킬로미터)', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    { id: 'pyeong', label: '평 (坪)', toBase: v => v * 3.30579, fromBase: v => v / 3.30579 },
    { id: 'tsubo', label: '坪 (일본 평)', toBase: v => v * 3.30579, fromBase: v => v / 3.30579 },
    { id: 'acre', label: 'acre (에이커)', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
    { id: 'hectare', label: '헥타르 (ha)', toBase: v => v * 10000, fromBase: v => v / 10000 },
  ],
  temperature: [
    { id: 'c', label: '°C (섭씨)', toBase: v => v, fromBase: v => v },
    { id: 'f', label: '°F (화씨)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    { id: 'k', label: 'K (켈빈)', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  ],
  filesize: [
    { id: 'b', label: 'B (바이트)', toBase: v => v, fromBase: v => v },
    { id: 'kb', label: 'KB (킬로바이트)', toBase: v => v * 1024, fromBase: v => v / 1024 },
    { id: 'mb', label: 'MB (메가바이트)', toBase: v => v * 1024 * 1024, fromBase: v => v / (1024 * 1024) },
    { id: 'gb', label: 'GB (기가바이트)', toBase: v => v * 1024 ** 3, fromBase: v => v / 1024 ** 3 },
    { id: 'tb', label: 'TB (테라바이트)', toBase: v => v * 1024 ** 4, fromBase: v => v / 1024 ** 4 },
  ],
}

const CATEGORY_LABELS: Record<Category, string> = {
  length: '길이',
  weight: '무게',
  area: '넓이',
  temperature: '온도',
  filesize: '파일 크기',
}

const CATEGORIES: Category[] = ['length', 'weight', 'area', 'temperature', 'filesize']

interface UnitConverterModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function UnitConverterModal({ onClose, asPanel }: UnitConverterModalProps): React.ReactElement {
  const [category, setCategory] = React.useState<Category>('length')
  const [inputValue, setInputValue] = React.useState('1')
  const [fromUnit, setFromUnit] = React.useState(UNITS.length[0].id)
  const [toUnit, setToUnit] = React.useState(UNITS.length[2].id)

  const units = UNITS[category]

  React.useEffect(() => {
    setFromUnit(units[0].id)
    setToUnit(units.length > 2 ? units[2].id : units[1].id)
  }, [category])

  const convert = (): string => {
    const val = parseFloat(inputValue)
    if (isNaN(val)) return '-'
    const from = units.find(u => u.id === fromUnit)
    const to = units.find(u => u.id === toUnit)
    if (!from || !to) return '-'
    const base = from.toBase(val)
    const result = to.fromBase(base)
    if (Math.abs(result) >= 1e10 || (Math.abs(result) < 1e-6 && result !== 0)) {
      return result.toExponential(6)
    }
    return parseFloat(result.toPrecision(10)).toLocaleString('ko-KR', { maximumFractionDigits: 8 })
  }

  const handleSwap = (): void => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  const fromUnitLabel = units.find(u => u.id === fromUnit)?.id.toUpperCase() || ''
  const toUnitLabel = units.find(u => u.id === toUnit)?.id.toUpperCase() || ''

  return (
    <Modal title="단위 변환기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
        {/* 카테고리 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--win-border)', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '8px 16px',
                background: category === cat ? 'var(--win-accent)' : 'transparent',
                color: category === cat ? '#fff' : 'var(--win-text-sub)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: category === cat ? 600 : 400,
                borderRadius: '6px 6px 0 0',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* 변환 입력 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '20px 24px',
            background: 'var(--win-surface-2)',
            borderRadius: 12,
            border: '1px solid var(--win-border)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>입력값</label>
            <input
              className="win-input"
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ fontSize: 20, fontWeight: 700, textAlign: 'right' }}
            />
            <select
              className="win-select"
              value={fromUnit}
              onChange={e => setFromUnit(e.target.value)}
            >
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>

          <button
            className="win-btn-ghost"
            style={{ fontSize: 24, padding: '8px 12px', flexShrink: 0 }}
            onClick={handleSwap}
            title="단위 교환"
          >
            ↕
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>결과</label>
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--win-border)',
                borderRadius: 6,
                background: 'var(--win-surface)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--win-accent)',
                textAlign: 'right',
                minHeight: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {convert()}
            </div>
            <select
              className="win-select"
              value={toUnit}
              onChange={e => setToUnit(e.target.value)}
            >
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 결과 큰 표시 */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <span style={{ fontSize: 18, color: 'var(--win-text-sub)' }}>
            {inputValue || '0'} {fromUnitLabel}
          </span>
          <span style={{ fontSize: 18, color: 'var(--win-text-muted)', margin: '0 12px' }}>=</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--win-accent)' }}>
            {convert()}
          </span>
          <span style={{ fontSize: 18, color: 'var(--win-text-sub)', marginLeft: 8 }}>
            {toUnitLabel}
          </span>
        </div>

        {/* 단위 전체 목록 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 10 }}>
            {CATEGORY_LABELS[category]} 단위 변환표 (기준값: {inputValue || '1'} {fromUnitLabel})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {units.map(u => {
              const val = parseFloat(inputValue) || 1
              const from = units.find(x => x.id === fromUnit)
              if (!from) return null
              const base = from.toBase(val)
              const result = u.fromBase(base)
              const display = isNaN(result) ? '-' : parseFloat(result.toPrecision(8)).toLocaleString('ko-KR', { maximumFractionDigits: 6 })
              return (
                <div
                  key={u.id}
                  onClick={() => setToUnit(u.id)}
                  style={{
                    padding: '10px 14px',
                    background: toUnit === u.id ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                    borderRadius: 8,
                    border: `1px solid ${toUnit === u.id ? 'var(--win-accent)' : 'var(--win-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 4 }}>{u.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: toUnit === u.id ? 'var(--win-accent)' : 'var(--win-text)' }}>
                    {display}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
