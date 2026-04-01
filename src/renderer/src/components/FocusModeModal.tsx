import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Session { duration: number; completedAt: number }

const SK = 'gs-focus-sessions'
function loadSessions(): Session[] { try { return JSON.parse(localStorage.getItem(SK) || '[]') } catch { return [] } }
function saveSessions(s: Session[]) { localStorage.setItem(SK, JSON.stringify(s)) }

const SOUNDS = [
  { id: 'rain', label: '비 소리', emoji: '\u{1F327}' },
  { id: 'cafe', label: '카페', emoji: '\u2615' },
  { id: 'forest', label: '숲', emoji: '\u{1F333}' },
  { id: 'none', label: '없음', emoji: '\u{1F508}' },
]

const PRESETS = [15, 25, 45, 60]

export default function FocusModeModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [sound, setSound] = useState('none')
  const [sessions, setSessions] = useState<Session[]>(loadSessions)
  const [tab, setTab] = useState<'timer' | 'stats'>('timer')
  const startTimeRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = minutes * 60

  const start = useCallback(() => {
    setSecondsLeft(totalSeconds)
    setRunning(true)
    startTimeRef.current = Date.now()
  }, [totalSeconds])

  const stop = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    if (elapsed >= 60) {
      const s: Session = { duration: elapsed, completedAt: Date.now() }
      const updated = [...sessions, s]
      setSessions(updated)
      saveSessions(updated)
    }
    setSecondsLeft(0)
  }, [sessions])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(p => {
        if (p <= 1) { stop(); return 0 }
        return p - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, stop])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const pct = running ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.completedAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const todayTotal = todaySessions.reduce((a, s) => a + s.duration, 0)

  return (
    <Modal title="집중 모드" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {[{ id: 'timer' as const, label: '타이머' }, { id: 'stats' as const, label: '통계' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'timer' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {running && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: rgba(T.bg, 0.3), borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, zIndex: 10 }}>
                <div style={{ fontSize: 11, color: rgba(T.fg, 0.4), textTransform: 'uppercase', letterSpacing: 2 }}>집중하세요</div>
                <div style={{ fontSize: 64, fontWeight: 700, color: T.teal, fontFamily: 'monospace' }}>{fmt(secondsLeft)}</div>
                <div style={{ width: 200, height: 4, borderRadius: 2, background: rgba(T.fg, 0.1) }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: T.gold, transition: 'width 1s linear' }} />
                </div>
                <div style={{ fontSize: 12, color: rgba(T.fg, 0.4) }}>
                  {SOUNDS.find(s => s.id === sound)?.emoji} {SOUNDS.find(s => s.id === sound)?.label}
                </div>
                <button className="win-btn-danger" onClick={stop} style={{ marginTop: 10 }}>중단하기</button>
              </div>
            )}

            {!running && (
              <>
                <div style={{ fontSize: 48, fontWeight: 700, color: T.teal, fontFamily: 'monospace' }}>{fmt(minutes * 60)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRESETS.map(p => (
                    <button key={p} onClick={() => setMinutes(p)} className={minutes === p ? 'win-btn-primary' : 'win-btn-secondary'} style={{ fontSize: 12 }}>{p}분</button>
                  ))}
                </div>
                <input type="range" min={5} max={120} step={5} value={minutes} onChange={e => setMinutes(Number(e.target.value))} style={{ width: 200 }} />

                <div style={{ display: 'flex', gap: 8 }}>
                  {SOUNDS.map(s => (
                    <button key={s.id} onClick={() => setSound(s.id)} style={{
                      padding: '6px 12px', borderRadius: 8, border: sound === s.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--win-border)',
                      background: sound === s.id ? 'rgba(99,102,241,0.15)' : 'var(--win-surface-2)', cursor: 'pointer', fontSize: 12, color: 'var(--win-text)',
                    }}>{s.emoji} {s.label}</button>
                  ))}
                </div>

                <button className="win-btn-primary" onClick={start} style={{ fontSize: 16, padding: '10px 40px', marginTop: 10 }}>시작</button>
              </>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '오늘 세션', value: `${todaySessions.length}회` },
                { label: '오늘 집중', value: `${Math.floor(todayTotal / 60)}분` },
                { label: '총 세션', value: `${sessions.length}회` },
              ].map(s => (
                <div key={s.label} style={{ padding: 12, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.teal }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {sessions.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>아직 기록이 없습니다</div>}
            {sessions.slice(-20).reverse().map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${rgba(T.fg, 0.05)}`, fontSize: 12 }}>
                <span style={{ color: 'var(--win-text-muted)' }}>{new Date(s.completedAt).toLocaleString('ko-KR')}</span>
                <span style={{ color: 'var(--win-text)', fontWeight: 600 }}>{Math.floor(s.duration / 60)}분</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
