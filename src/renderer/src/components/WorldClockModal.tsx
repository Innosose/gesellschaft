import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface City { name: string; tz: string; label: string }

const ALL_CITIES: City[] = [
  { name: '서울', tz: 'Asia/Seoul', label: 'KST' },
  { name: '도쿄', tz: 'Asia/Tokyo', label: 'JST' },
  { name: '베이징', tz: 'Asia/Shanghai', label: 'CST' },
  { name: '뉴욕', tz: 'America/New_York', label: 'EST' },
  { name: '로스앤젤레스', tz: 'America/Los_Angeles', label: 'PST' },
  { name: '런던', tz: 'Europe/London', label: 'GMT' },
  { name: '파리', tz: 'Europe/Paris', label: 'CET' },
  { name: '베를린', tz: 'Europe/Berlin', label: 'CET' },
  { name: '모스크바', tz: 'Europe/Moscow', label: 'MSK' },
  { name: '시드니', tz: 'Australia/Sydney', label: 'AEDT' },
  { name: '두바이', tz: 'Asia/Dubai', label: 'GST' },
  { name: '싱가포르', tz: 'Asia/Singapore', label: 'SGT' },
  { name: '방콕', tz: 'Asia/Bangkok', label: 'ICT' },
  { name: '뭄바이', tz: 'Asia/Kolkata', label: 'IST' },
  { name: '상파울루', tz: 'America/Sao_Paulo', label: 'BRT' },
]

const DEFAULT_TZS = ['Asia/Seoul', 'America/New_York', 'Europe/London', 'Asia/Tokyo']

function getStoredCities(): string[] {
  try {
    const raw = localStorage.getItem('gs-world-clock')
    return raw ? JSON.parse(raw) : DEFAULT_TZS
  } catch { return DEFAULT_TZS }
}

function AnalogClock({ hours, minutes, seconds, size = 80 }: { hours: number; minutes: number; seconds: number; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  const hAngle = ((hours % 12) + minutes / 60) * 30 - 90
  const mAngle = minutes * 6 - 90
  const sAngle = seconds * 6 - 90
  const hand = (angle: number, len: number, w: number, color: string) => {
    const rad = angle * Math.PI / 180
    return <line x1={cx} y1={cy} x2={cx + Math.cos(rad) * len} y2={cy + Math.sin(rad) * len} stroke={color} strokeWidth={w} strokeLinecap="round" />
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={rgba(T.fg, 0.15)} strokeWidth={1.5} />
      {[...Array(12)].map((_, i) => {
        const a = i * 30 * Math.PI / 180
        return <circle key={i} cx={cx + Math.cos(a - Math.PI / 2) * (r - 6)} cy={cy + Math.sin(a - Math.PI / 2) * (r - 6)} r={i % 3 === 0 ? 2 : 1} fill={rgba(T.fg, 0.3)} />
      })}
      {hand(hAngle, r * 0.5, 2.5, T.teal)}
      {hand(mAngle, r * 0.7, 1.5, rgba(T.fg, 0.7))}
      {hand(sAngle, r * 0.75, 0.8, T.danger)}
      <circle cx={cx} cy={cy} r={2} fill={T.teal} />
    </svg>
  )
}

export default function WorldClockModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [selected, setSelected] = useState<string[]>(getStoredCities)
  const [now, setNow] = useState(new Date())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { localStorage.setItem('gs-world-clock', JSON.stringify(selected)) }, [selected])

  const addCity = useCallback((tz: string) => {
    if (!selected.includes(tz)) setSelected(prev => [...prev, tz])
    setAdding(false)
  }, [selected])

  const removeCity = useCallback((tz: string) => {
    setSelected(prev => prev.filter(t => t !== tz))
  }, [])

  const getTime = (tz: string) => {
    const str = now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false })
    const [h, m, s] = str.split(':').map(Number)
    return { h, m, s, display: now.toLocaleString('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) }
  }

  const getDate = (tz: string) => now.toLocaleDateString('ko-KR', { timeZone: tz, month: 'short', day: 'numeric', weekday: 'short' })

  return (
    <Modal title="세계 시계" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="win-btn-primary" onClick={() => setAdding(!adding)} style={{ fontSize: 12 }}>{adding ? '취소' : '+ 도시 추가'}</button>
        </div>

        {adding && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
            {ALL_CITIES.filter(c => !selected.includes(c.tz)).map(c => (
              <button key={c.tz} className="win-btn-ghost" onClick={() => addCity(c.tz)} style={{ fontSize: 11, padding: '3px 10px' }}>{c.name}</button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {selected.map(tz => {
            const city = ALL_CITIES.find(c => c.tz === tz)
            if (!city) return null
            const time = getTime(tz)
            return (
              <div key={tz} style={{ padding: 14, borderRadius: 12, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
                <button onClick={() => removeCity(tz)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 14 }}>x</button>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--win-text)' }}>{city.name}</div>
                <div style={{ fontSize: 10, color: T.teal }}>{city.label}</div>
                <AnalogClock hours={time.h} minutes={time.m} seconds={time.s} />
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--win-text)', fontVariantNumeric: 'tabular-nums' }}>{time.display}</div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{getDate(tz)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
