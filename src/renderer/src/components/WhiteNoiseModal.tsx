import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Sound = { id: string; name: string; emoji: string; color: string }

const SOUNDS: Sound[] = [
  { id: 'rain', name: '빗소리', emoji: '🌧️', color: T.teal },
  { id: 'ocean', name: '파도', emoji: '🌊', color: T.teal },
  { id: 'forest', name: '숲', emoji: '🌲', color: T.success },
  { id: 'fire', name: '모닥불', emoji: '🔥', color: T.warning },
  { id: 'wind', name: '바람', emoji: '🌬️', color: T.teal },
  { id: 'thunder', name: '천둥', emoji: '⛈️', color: T.gold },
  { id: 'bird', name: '새소리', emoji: '🐦', color: T.warning },
  { id: 'cafe', name: '카페', emoji: '☕', color: T.danger },
]

function Particles({ color, active }: { color: string; active: boolean }) {
  const [dots, setDots] = useState<{ x: number; y: number; s: number; d: number }[]>([])
  useEffect(() => {
    if (!active) { setDots([]); return }
    const create = () => Array.from({ length: 20 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: 2 + Math.random() * 4, d: 2 + Math.random() * 3,
    }))
    setDots(create())
    const t = setInterval(() => setDots(create()), 3000)
    return () => clearInterval(t)
  }, [active])
  if (!active) return null
  return (
    <svg width="100%" height="60" style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.4 }}>
      {dots.map((d, i) => (
        <circle key={i} cx={`${d.x}%`} cy={d.y * 0.6} r={d.s} fill={color} opacity={0.3 + Math.random() * 0.4}>
          <animate attributeName="cy" values={`${d.y * 0.6};${d.y * 0.6 + 10};${d.y * 0.6}`} dur={`${d.d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${d.d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  )
}

export default function WhiteNoiseModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [active, setActive] = useState<string | null>(null)
  const [volume, setVolume] = useState(50)
  const [timerMin, setTimerMin] = useState(30)
  const [remaining, setRemaining] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback((id: string) => {
    setActive(id); setPlaying(true); setRemaining(timerMin * 60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setPlaying(false); setActive(null)
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [timerMin])

  const stop = useCallback(() => {
    setPlaying(false); setActive(null); setRemaining(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const activeSound = SOUNDS.find(s => s.id === active)

  return (
    <Modal title="백색소음" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>볼륨: {volume}%</label>
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div style={{ minWidth: 100 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>타이머 (분)</label>
            <input className="win-input" type="number" min={1} max={180} value={timerMin} onChange={e => setTimerMin(Number(e.target.value))} style={{ width: 80 }} />
          </div>
          {playing && <button className="win-btn-danger" onClick={stop} style={{ fontSize: 12, marginTop: 16 }}>정지</button>}
        </div>

        {/* Playing indicator */}
        {playing && activeSound && (
          <div style={{
            padding: 20, borderRadius: 12, textAlign: 'center', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${rgba(activeSound.color, 0.08)}, ${rgba(activeSound.color, 0.02)})`,
            border: `1px solid ${rgba(activeSound.color, 0.2)}`,
          }}>
            <Particles color={activeSound.color} active={playing} />
            <div style={{ fontSize: 36, marginBottom: 8 }}>{activeSound.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--win-text)', marginBottom: 4 }}>{activeSound.name} 재생 중</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: activeSound.color, fontVariantNumeric: 'tabular-nums' }}>{formatTime(remaining)}</div>
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>볼륨 {volume}%</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              {[...Array(Math.ceil(volume / 10))].map((_, i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 2, background: activeSound.color,
                  animation: `pulse ${0.5 + Math.random()}s ease-in-out infinite alternate`,
                  height: 8 + Math.random() * 20,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Sound grid */}
        <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>사운드 선택</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {SOUNDS.map(s => (
            <button key={s.id} onClick={() => playing && active === s.id ? stop() : start(s.id)} style={{
              padding: 16, borderRadius: 12, border: `1px solid ${active === s.id ? rgba(s.color, 0.4) : 'var(--win-border)'}`,
              background: active === s.id ? rgba(s.color, 0.08) : 'var(--win-surface-2)',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: active === s.id ? s.color : 'var(--win-text-sub)' }}>{s.name}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
