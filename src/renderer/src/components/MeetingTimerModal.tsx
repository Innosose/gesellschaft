import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const PRESETS = [5, 10, 15, 20, 30, 45, 60]

const POMO_WORK  = 25 * 60
const POMO_SHORT =  5 * 60
const POMO_LONG  = 15 * 60
const SESSIONS_BEFORE_LONG = 4

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

// ── 포모도로 탭 ─────────────────────────────────────────────────────────────────

type PomoPhase = 'work' | 'short' | 'long'

const PHASE_LABELS: Record<PomoPhase, string> = {
  work:  '집중',
  short: '짧은 휴식',
  long:  '긴 휴식',
}
const PHASE_COLORS: Record<PomoPhase, string> = {
  work:  T.gold,
  short: T.success,
  long:  T.teal,
}
const PHASE_SECS: Record<PomoPhase, number> = {
  work:  POMO_WORK,
  short: POMO_SHORT,
  long:  POMO_LONG,
}

function PomodoroTab(): React.ReactElement {
  const [phase, setPhase]         = useState<PomoPhase>('work')
  const [session, setSession]     = useState(1)       // 1-4
  const [remaining, setRemaining] = useState(POMO_WORK)
  const [running, setRunning]     = useState(false)
  const [done, setDone]           = useState(false)
  const [autoAdv, setAutoAdv]     = useState(false)
  const [customWork,  setCustomWork]  = useState('25')
  const [customShort, setCustomShort] = useState('5')
  const [customLong,  setCustomLong]  = useState('15')

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseRef    = useRef(phase)
  const sessionRef  = useRef(session)

  phaseRef.current   = phase
  sessionRef.current = session

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  const advancePhase = useCallback(() => {
    const cur = phaseRef.current
    const sess = sessionRef.current
    let next: PomoPhase
    let nextSession = sess

    if (cur === 'work') {
      if (sess >= SESSIONS_BEFORE_LONG) {
        next = 'long'
        nextSession = 1
      } else {
        next = 'short'
        nextSession = sess + 1
      }
    } else {
      next = 'work'
    }

    setPhase(next)
    setSession(nextSession)
    const secs = PHASE_SECS[next]
    setRemaining(secs)
    setDone(false)

    if (autoAdv) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setRunning(false)
            setDone(true)
            beep('done')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      stop()
    }
  }, [stop, autoAdv])

  const start = useCallback(() => {
    if (done) return
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setRunning(false)
          setDone(true)
          beep('done')
          advancePhase()
          return 0
        }
        if (prev === 61) beep('tick')
        return prev - 1
      })
    }, 1000)
  }, [done, advancePhase])

  const reset = useCallback(() => {
    stop()
    setPhase('work')
    setSession(1)
    setRemaining(PHASE_SECS['work'])
    setDone(false)
  }, [stop])

  const applyCustom = (): void => {
    const w = parseInt(customWork)
    const s = parseInt(customShort)
    const l = parseInt(customLong)
    if (!isNaN(w) && w > 0) PHASE_SECS['work']  = w * 60
    if (!isNaN(s) && s > 0) PHASE_SECS['short'] = s * 60
    if (!isNaN(l) && l > 0) PHASE_SECS['long']  = l * 60
    reset()
  }

  const totalSecs = PHASE_SECS[phase]
  const progress  = totalSecs > 0 ? (totalSecs - remaining) / totalSecs : 0
  const color     = PHASE_COLORS[phase]
  const circumference = 2 * Math.PI * 54
  const dashOffset    = circumference * (1 - progress)

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* 왼쪽: 타이머 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

        {/* 세션 점 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Array.from({ length: SESSIONS_BEFORE_LONG }, (_, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < session - (phase !== 'work' ? 0 : 0) || (phase === 'long')
                  ? color
                  : rgba(T.fg, 0.18),
                transition: 'background 0.3s ease',
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: rgba(T.fg, 0.5), marginLeft: 4 }}>
            {phase === 'long' ? '긴 휴식' : `${session}/${SESSIONS_BEFORE_LONG} 세션`}
          </span>
        </div>

        {/* 페이즈 라벨 */}
        <div style={{
          padding: '4px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: `${color}22`, border: `1px solid ${color}55`,
          color, letterSpacing: '0.04em',
        }}>
          {PHASE_LABELS[phase]}
        </div>

        {/* 원형 타이머 */}
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--win-surface-3)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              stroke={color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <span style={{
              fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color, letterSpacing: '0.04em', transition: 'color 0.5s ease',
            }}>
              {fmt(remaining)}
            </span>
            {done && <span style={{ fontSize: 10, color, fontWeight: 600 }}>완료!</span>}
          </div>
        </div>

        {/* 제어 버튼 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!running && (
            <button
              className="win-btn-primary"
              style={{ padding: '8px 28px', fontSize: 14, fontWeight: 600, background: color, borderColor: color }}
              onClick={start}
              disabled={remaining === 0}
            >
              ▶ 시작
            </button>
          )}
          {running && (
            <button className="win-btn-secondary" style={{ padding: '8px 28px', fontSize: 14 }} onClick={stop}>
              ⏸ 일시정지
            </button>
          )}
          <button className="win-btn-secondary" style={{ padding: '8px 18px', fontSize: 14 }} onClick={reset}>
            ↺ 초기화
          </button>
        </div>

        {done && (
          <button
            className="win-btn-secondary"
            style={{ fontSize: 12, padding: '5px 16px', borderColor: color, color }}
            onClick={advancePhase}
          >
            다음 단계 →
          </button>
        )}

        {/* 자동 진행 토글 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--win-text-muted)' }}>
          <input type="checkbox" checked={autoAdv} onChange={e => setAutoAdv(e.target.checked)} />
          단계 자동 진행
        </label>
      </div>

      {/* 오른쪽: 설정 */}
      <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--win-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          시간 설정 (분)
        </div>
        {[
          { label: '집중', val: customWork, set: setCustomWork },
          { label: '짧은 휴식', val: customShort, set: setCustomShort },
          { label: '긴 휴식', val: customLong, set: setCustomLong },
        ].map(({ label, val, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--win-text-sub)', width: 60 }}>{label}</span>
            <input
              className="win-input"
              style={{ width: 52, textAlign: 'center', fontSize: 12 }}
              value={val}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCustom()}
            />
            <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>분</span>
          </div>
        ))}
        <button className="win-btn-secondary" style={{ fontSize: 12, padding: '5px 10px', marginTop: 4 }} onClick={applyCustom}>
          적용
        </button>

        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: rgba(T.fg, 0.04), border: `1px solid ${rgba(T.fg, 0.08)}`, fontSize: 11, color: 'var(--win-text-muted)', lineHeight: 1.7 }}>
          <div>집중 × 4세션</div>
          <div>→ 긴 휴식</div>
          <div style={{ marginTop: 6, color: rgba(T.fg, 0.35), fontSize: 10 }}>
            총 ~2시간 사이클
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 회의 타이머 탭 (기존 로직 유지) ──────────────────────────────────────────────

function MeetingTimerTab(): React.ReactElement {
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning]     = useState(false)
  const [done, setDone]           = useState(false)
  const [customMin, setCustomMin] = useState('25')
  const [agenda, setAgenda]       = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const doneRef     = useRef(false)

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

  const progress    = totalSecs > 0 ? (totalSecs - remaining) / totalSecs : 0
  const isWarning   = remaining <= 60 && remaining > 0
  const isNearEnd   = remaining <= 300 && remaining > 60
  const timerColor  = done ? T.danger : isWarning ? T.danger : isNearEnd ? T.warning : T.gold
  const circumference = 2 * Math.PI * 54
  const dashOffset    = circumference * (1 - progress)

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', width: '100%' }}>
          {PRESETS.map(m => (
            <button
              key={m}
              className="win-btn-secondary"
              style={{
                padding: '4px 12px', fontSize: 12,
                background: totalSecs === m * 60 && !running ? 'var(--win-accent-dim)' : undefined,
                borderColor: totalSecs === m * 60 && !running ? 'var(--win-accent)' : undefined,
              }}
              onClick={() => setPreset(m)}
            >
              {m}분
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="win-input" style={{ width: 70, textAlign: 'center' }}
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

        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--win-surface-3)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              stroke={timerColor} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: timerColor, letterSpacing: '0.04em', transition: 'color 0.5s ease' }}>
              {fmt(remaining)}
            </span>
            {done && <span style={{ fontSize: 10, color: T.danger, fontWeight: 600 }}>종료</span>}
            {isWarning && !done && <span style={{ fontSize: 10, color: T.danger, fontWeight: 600, animation: 'pulse 1s infinite' }}>곧 종료</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!running && !done && (
            <button className="win-btn-primary" style={{ padding: '8px 28px', fontSize: 14, fontWeight: 600 }} onClick={start} disabled={remaining === 0}>
              ▶ 시작
            </button>
          )}
          {running && (
            <button className="win-btn-secondary" style={{ padding: '8px 28px', fontSize: 14 }} onClick={stop}>
              ⏸ 일시정지
            </button>
          )}
          <button className="win-btn-secondary" style={{ padding: '8px 18px', fontSize: 14 }} onClick={() => reset()}>
            ↺ 재설정
          </button>
        </div>

        {done && (
          <div style={{ padding: '10px 20px', background: rgba(T.danger, 0.15), border: `1px solid ${T.danger}`, borderRadius: 8, fontSize: 14, color: T.danger, fontWeight: 600, textAlign: 'center' }}>
            🔔 회의 시간이 종료되었습니다!
          </div>
        )}
        {(running || (!running && remaining < totalSecs && !done)) && (
          <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
            경과 {fmt(totalSecs - remaining)} / 전체 {fmt(totalSecs)}
          </div>
        )}
      </div>

      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>회의 메모</label>
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
          onClick={async () => { if (!agenda) return; try { await navigator.clipboard.writeText(agenda) } catch { /* clipboard unavailable */ } }}
          disabled={!agenda}
        >
          메모 복사
        </button>
      </div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────────

type Tab = 'meeting' | 'pomodoro'

export default function MeetingTimerModal({
  onClose,
  asPanel,
}: {
  onClose: () => void
  asPanel?: boolean
}): React.ReactElement {
  const [tab, setTab] = useState<Tab>('meeting')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'meeting',  label: '회의 타이머' },
    { id: 'pomodoro', label: '포모도로' },
  ]

  return (
    <Modal title="타이머" onClose={onClose} asPanel={asPanel}>
      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
            color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'meeting'  && <MeetingTimerTab />}
      {tab === 'pomodoro' && <PomodoroTab />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Modal>
  )
}
