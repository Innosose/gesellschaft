import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const STORAGE_KEY = 'gs-break-timer'
const WORK_OPTIONS = [25, 50, 90]
const BREAK_OPTIONS = [5, 10, 15]

interface TimerState {
  workMin: number
  breakMin: number
  autoStart: boolean
  sessions: number
  lastDate: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadState(): TimerState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const state: TimerState = {
      workMin: raw.workMin || 25,
      breakMin: raw.breakMin || 5,
      autoStart: raw.autoStart ?? false,
      sessions: raw.lastDate === today() ? (raw.sessions || 0) : 0,
      lastDate: today()
    }
    return state
  } catch {
    return { workMin: 25, breakMin: 5, autoStart: false, sessions: 0, lastDate: today() }
  }
}

function saveState(s: TimerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(); osc.stop(ctx.currentTime + 0.8)
  } catch { /* noop */ }
}

export default function BreakTimerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [config, setConfig] = useState<TimerState>(loadState)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'work' | 'break'>('work')
  const [flash, setFlash] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSec = phase === 'work' ? config.workMin * 60 : config.breakMin * 60
  const remaining = Math.max(0, totalSec - elapsed)
  const progress = totalSec > 0 ? (elapsed / totalSec) * 100 : 0

  useEffect(() => { saveState(config) }, [config])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  // Phase transition
  useEffect(() => {
    if (elapsed >= totalSec && running) {
      beep()
      setRunning(false)
      if (phase === 'work') {
        setFlash(true)
        setTimeout(() => setFlash(false), 3000)
        const newSessions = config.sessions + 1
        setConfig(prev => ({ ...prev, sessions: newSessions, lastDate: today() }))
        if (config.autoStart) {
          setPhase('break')
          setElapsed(0)
          setTimeout(() => setRunning(true), 1500)
        }
      } else {
        if (config.autoStart) {
          setPhase('work')
          setElapsed(0)
          setTimeout(() => setRunning(true), 1500)
        }
      }
    }
  }, [elapsed, totalSec, running, phase, config])

  const start = useCallback(() => { setRunning(true) }, [])
  const pause = useCallback(() => { setRunning(false) }, [])
  const reset = useCallback(() => {
    setRunning(false)
    setElapsed(0)
    setPhase('work')
    setFlash(false)
  }, [])

  const switchPhase = useCallback((p: 'work' | 'break') => {
    setRunning(false); setElapsed(0); setPhase(p)
  }, [])

  const updateConfig = useCallback((patch: Partial<TimerState>) => {
    setConfig(prev => ({ ...prev, ...patch }))
    setElapsed(0); setRunning(false)
  }, [])

  return (
    <Modal title="휴식 알림" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-3">
        {/* Flash overlay */}
        {flash && (
          <div style={{
            background: rgba(T.gold, 0.12), borderRadius: 8, padding: '16px',
            textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite',
            border: `1px solid ${rgba(T.gold, 0.3)}`
          }}>
            <div style={{ fontSize: 22, color: T.gold, fontWeight: 700 }}>쉬어가세요</div>
            <div style={{ fontSize: 12, color: 'var(--win-text-muted)', marginTop: 4 }}>
              {config.workMin}분 집중 완료!
            </div>
          </div>
        )}

        {/* Timer display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: phase === 'work' ? T.gold : T.teal, marginBottom: 4, fontWeight: 600 }}>
            {phase === 'work' ? '집중 시간' : '휴식 시간'}
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, fontFamily: 'monospace', color: 'var(--win-text)', letterSpacing: 2 }}>
            {fmtTime(remaining)}
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 2, background: rgba(T.gold, 0.1), marginTop: 8 }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width 1s linear',
              width: `${Math.min(progress, 100)}%`,
              background: phase === 'work' ? T.gold : T.teal
            }} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {!running ? (
            <button className="win-btn-primary" style={{ padding: '6px 20px' }} onClick={start}>시작</button>
          ) : (
            <button className="win-btn-secondary" style={{ padding: '6px 20px' }} onClick={pause}>일시정지</button>
          )}
          <button className="win-btn-danger" style={{ padding: '6px 14px' }} onClick={reset}>초기화</button>
          <button className="win-btn-secondary" style={{ padding: '6px 14px', fontSize: 11 }}
            onClick={() => switchPhase(phase === 'work' ? 'break' : 'work')}>
            {phase === 'work' ? '휴식으로' : '집중으로'}
          </button>
        </div>

        {/* Config */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 4 }}>집중 시간</div>
            <div className="flex gap-1">
              {WORK_OPTIONS.map(m => (
                <button key={m}
                  className={config.workMin === m ? 'win-btn-primary' : 'win-btn-secondary'}
                  style={{ fontSize: 11, padding: '2px 8px', flex: 1 }}
                  onClick={() => updateConfig({ workMin: m })}>
                  {m}분
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 4 }}>휴식 시간</div>
            <div className="flex gap-1">
              {BREAK_OPTIONS.map(m => (
                <button key={m}
                  className={config.breakMin === m ? 'win-btn-primary' : 'win-btn-secondary'}
                  style={{ fontSize: 11, padding: '2px 8px', flex: 1 }}
                  onClick={() => updateConfig({ breakMin: m })}>
                  {m}분
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between" style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={config.autoStart}
              onChange={e => updateConfig({ autoStart: e.target.checked })} />
            자동 시작
          </label>
          <span>오늘 완료: <strong style={{ color: T.gold }}>{config.sessions}</strong>회</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </Modal>
  )
}
