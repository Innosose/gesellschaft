import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from './SearchModal'

const PRESETS = [5, 10, 15, 20, 30, 45, 60]

function beep(type: 'tick' | 'done'): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (type === 'done') {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.9)
    } else {
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    }
  } catch {
    // AudioContext not available
  }
}

function fmt(secs: number): string {
  const m = Math.floor(Math.abs(secs) / 60)
  const s = Math.abs(secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function MeetingTimerModal({
  onClose,
  asPanel,
}: {
  onClose: () => void
  asPanel?: boolean
}): React.ReactElement {
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [customMin, setCustomMin] = useState('25')
  const [agenda, setAgenda] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const doneRef = useRef(false)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (doneRef.current) return
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setRunning(false)
          setDone(true)
          doneRef.current = true
          beep('done')
          return 0
        }
        if (prev === 61) beep('tick')
        return prev - 1
      })
    }, 1000)
  }, [])

  const reset = useCallback((mins?: number) => {
    stop()
    const secs = (mins ?? totalSecs / 60) * 60
    setTotalSecs(secs)
    setRemaining(secs)
    setDone(false)
    doneRef.current = false
  }, [stop, totalSecs])

  useEffect(() => () => stop(), [stop])

  const setPreset = (mins: number): void => {
    setCustomMin(String(mins))
    reset(mins)
  }

  const applyCustom = (): void => {
    const mins = parseInt(customMin)
    if (!isNaN(mins) && mins > 0 && mins <= 480) reset(mins)
  }

  const progress = totalSecs > 0 ? (totalSecs - remaining) / totalSecs : 0
  const isWarning = remaining <= 60 && remaining > 0
  const isNearEnd = remaining <= 300 && remaining > 60

  const timerColor = done ? '#e74c3c' : isWarning ? '#e74c3c' : isNearEnd ? '#f39c12' : '#a78bfa'

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - progress)

  return (
    <Modal title="회의 타이머" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 24, height: '100%' }}>
        {/* 왼쪽: 타이머 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* 프리셋 버튼 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', width: '100%' }}>
            {PRESETS.map(m => (
              <button
                key={m}
                className="win-btn-secondary"
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  background: totalSecs === m * 60 && !running ? 'var(--win-accent-dim)' : undefined,
                  borderColor: totalSecs === m * 60 && !running ? 'var(--win-accent)' : undefined,
                }}
                onClick={() => setPreset(m)}
              >
                {m}분
              </button>
            ))}
          </div>

          {/* 커스텀 시간 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="win-input"
              style={{ width: 70, textAlign: 'center' }}
              value={customMin}
              onChange={e => setCustomMin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCustom()}
              placeholder="분"
            />
            <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>분</span>
            <button className="win-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={applyCustom}>
              설정
            </button>
          </div>

          {/* 원형 타이머 */}
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="54" fill="none" stroke="var(--win-surface-3)" strokeWidth="8" />
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke={timerColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: timerColor,
                  letterSpacing: '0.04em',
                  transition: 'color 0.5s ease',
                }}
              >
                {fmt(remaining)}
              </span>
              {done && (
                <span style={{ fontSize: 10, color: '#e74c3c', fontWeight: 600 }}>종료</span>
              )}
              {isWarning && !done && (
                <span style={{ fontSize: 10, color: '#e74c3c', fontWeight: 600, animation: 'pulse 1s infinite' }}>
                  곧 종료
                </span>
              )}
            </div>
          </div>

          {/* 제어 버튼 */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!running && !done && (
              <button
                className="win-btn-primary"
                style={{ padding: '8px 28px', fontSize: 14, fontWeight: 600 }}
                onClick={start}
                disabled={remaining === 0}
              >
                ▶ 시작
              </button>
            )}
            {running && (
              <button
                className="win-btn-secondary"
                style={{ padding: '8px 28px', fontSize: 14 }}
                onClick={stop}
              >
                ⏸ 일시정지
              </button>
            )}
            <button
              className="win-btn-secondary"
              style={{ padding: '8px 18px', fontSize: 14 }}
              onClick={() => reset()}
            >
              ↺ 재설정
            </button>
          </div>

          {done && (
            <div
              style={{
                padding: '10px 20px',
                background: 'rgba(231,76,60,0.15)',
                border: '1px solid #e74c3c',
                borderRadius: 8,
                fontSize: 14,
                color: '#e74c3c',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              🔔 회의 시간이 종료되었습니다!
            </div>
          )}

          {/* 경과 시간 표시 */}
          {(running || (!running && remaining < totalSecs && !done)) && (
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
              경과 {fmt(totalSecs - remaining)} / 전체 {fmt(totalSecs)}
            </div>
          )}
        </div>

        {/* 오른쪽: 회의 메모 */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>
            회의 메모
          </label>
          <textarea
            className="win-textarea"
            style={{ flex: 1, resize: 'none', fontSize: 12, minHeight: 200 }}
            value={agenda}
            onChange={e => setAgenda(e.target.value)}
            placeholder={'회의 안건, 참석자, 결정 사항 등을 메모하세요...\n\n예)\n📌 안건 1:\n📌 안건 2:\n\n✅ 결정 사항:\n🔖 다음 액션:'}
          />
          <button
            className="win-btn-secondary"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={async () => {
              if (!agenda) return
              await navigator.clipboard.writeText(agenda)
            }}
            disabled={!agenda}
          >
            메모 복사
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Modal>
  )
}
