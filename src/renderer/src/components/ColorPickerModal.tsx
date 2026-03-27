import React from 'react'
import { Modal } from './SearchModal'

const HISTORY_KEY = 'gs_color_history'
const PRESET_COLORS = [
  '#ff0000', '#ff6600', '#ffcc00', '#ffff00',
  '#00ff00', '#00cc66', '#00cccc', '#0066ff',
  '#6600ff', '#cc00ff', '#ff0099', '#ffffff',
  '#cccccc', '#888888', '#444444', '#000000',
]

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const v = max
  const d = max - min
  const s = max === 0 ? 0 : d / max
  let h = 0
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)]
}

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(colors: string[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(colors.slice(0, 12)))
}

interface ColorPickerModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function ColorPickerModal({ onClose, asPanel }: ColorPickerModalProps): React.ReactElement {
  const [hue, setHue] = React.useState(210)
  const [sat, setSat] = React.useState(80)
  const [lig, setLig] = React.useState(50)
  const [alpha, setAlpha] = React.useState(100)
  const [history, setHistory] = React.useState<string[]>(() => loadHistory())
  const [copiedKey, setCopiedKey] = React.useState('')
  const slPickerRef = React.useRef<HTMLDivElement>(null)
  const hueWheelRef = React.useRef<HTMLDivElement>(null)

  const [r, g, b] = hslToRgb(hue, sat, lig)
  const hex = rgbToHex(r, g, b)
  const [, hsvS, hsvV] = rgbToHsv(r, g, b)
  const a01 = alpha / 100

  const formats = {
    'HEX': hex,
    'RGB': `rgb(${r}, ${g}, ${b})`,
    'RGBA': `rgba(${r}, ${g}, ${b}, ${a01.toFixed(2)})`,
    'HSL': `hsl(${hue}, ${sat}%, ${lig}%)`,
    'HSV (디자인툴)': `hsv(${hue}, ${hsvS}%, ${hsvV}%)`,
  }

  const setColor = (hex: string): void => {
    const rgb = hexToRgb(hex)
    if (!rgb) return
    const [nh, ns, nl] = rgbToHsl(rgb[0], rgb[1], rgb[2])
    setHue(nh)
    setSat(ns)
    setLig(nl)
    addToHistory(hex)
  }

  const addToHistory = (color: string): void => {
    setHistory(prev => {
      const filtered = prev.filter(c => c !== color)
      const updated = [color, ...filtered].slice(0, 12)
      saveHistory(updated)
      return updated
    })
  }

  const handleSLPick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    // x = saturation, y = inverted lightness
    const newS = Math.round(x * 100)
    const newL = Math.round((1 - y) * 100)
    setSat(newS)
    setLig(newL)
  }

  const handleHueWheel = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
    setHue(Math.round((angle + 360) % 360))
  }

  const handleCopy = async (key: string, val: string): Promise<void> => {
    await navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1200)
    addToHistory(hex)
  }

  // Cursor position on SL picker
  const slCursorX = `${sat}%`
  const slCursorY = `${100 - lig}%`

  return (
    <Modal title="색상 피커" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 20, height: '100%' }}>
        {/* 왼쪽: 피커 컨트롤 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 260, flexShrink: 0 }}>
          {/* S/L 그라데이션 피커 */}
          <div
            ref={slPickerRef}
            onClick={handleSLPick}
            style={{
              width: '100%',
              height: 180,
              borderRadius: 8,
              border: '1px solid var(--win-border)',
              position: 'relative',
              cursor: 'crosshair',
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
            }}
          >
            {/* Cursor */}
            <div style={{
              position: 'absolute',
              left: slCursorX,
              top: slCursorY,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              background: hex,
            }} />
          </div>

          {/* 색조 휠 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              ref={hueWheelRef}
              onClick={handleHueWheel}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid var(--win-border)',
                cursor: 'crosshair',
                flexShrink: 0,
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              }}
            />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>색조 (H): {hue}°</label>
              <input
                type="range" min={0} max={359} value={hue}
                onChange={e => setHue(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* 슬라이더들 */}
          {[
            { label: `채도 (S): ${sat}%`, value: sat, setter: setSat, max: 100 },
            { label: `밝기 (L): ${lig}%`, value: lig, setter: setLig, max: 100 },
            { label: `투명도 (A): ${alpha}%`, value: alpha, setter: setAlpha, max: 100 },
          ].map(({ label, value, setter, max }) => (
            <div key={label}>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>{label}</label>
              <input
                type="range" min={0} max={max} value={value}
                onChange={e => setter(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          ))}

          {/* 미리보기 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                width: 60,
                height: 40,
                borderRadius: 8,
                border: '1px solid var(--win-border)',
                background: `rgba(${r},${g},${b},${a01})`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--win-text)' }}>{hex}</div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{`rgba(${r},${g},${b},${a01.toFixed(2)})`}</div>
            </div>
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 포맷별 복사 */}
          <div
            style={{
              padding: 14,
              background: 'var(--win-surface-2)',
              borderRadius: 10,
              border: '1px solid var(--win-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-text-sub)', marginBottom: 4 }}>색상 코드</div>
            {Object.entries(formats).map(([key, val]) => (
              <div
                key={key}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ width: 42, fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>{key}</span>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: 'var(--win-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {val}
                </span>
                <button
                  className="win-btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
                  onClick={() => handleCopy(key, val)}
                >
                  {copiedKey === key ? '✅' : '복사'}
                </button>
              </div>
            ))}
          </div>

          {/* 프리셋 컬러 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 8 }}>프리셋 색상</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: c,
                    border: hex === c ? '2px solid var(--win-accent)' : '1px solid var(--win-border)',
                    cursor: 'pointer',
                    boxShadow: hex === c ? '0 0 0 2px var(--win-accent-dim)' : 'none',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* 색상 히스토리 */}
          {history.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 8 }}>
                최근 사용 색상
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {history.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setColor(c)}
                    title={c}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c,
                      border: hex === c ? '2px solid var(--win-accent)' : '1px solid var(--win-border)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
