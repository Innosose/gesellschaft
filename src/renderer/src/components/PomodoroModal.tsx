import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'
import type { PomodoroPhase, PomodoroSession, PomodoroStats } from '../../../shared/types'

// ── 설정 ────────────────────────────────────────────────────────────────────
const PHASE_DURATION_SEC: Record<PomodoroPhase, number> = {
  'work':        25 * 60,
  'short-break':  5 * 60,
  'long-break':  15 * 60,
}
const LONG_BREAK_EVERY = 4   // 포모도로 4번마다 긴 휴식

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  'work':        '집중',
  'short-break': '짧은 휴식',
  'long-break':  '긴 휴식',
}

const PHASE_COLOR: Record<PomodoroPhase, string> = {
  'work':        T.danger,
  'short-break': T.success,
  'long-break':  T.teal,
}

// ── 통계 헬퍼 ───────────────────────────────────────────────────────────────
function weekLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

// ── Props ────────────────────────────────────────────────────────────────────
interface PomodoroModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function PomodoroModal({ onClose, asPanel }: PomodoroModalProps): React.ReactElement {
  const [tab, setTab] = useState<'timer' | 'stats'>('timer')

  // ── 타이머 상태 ────────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<PomodoroPhase>('work')
  const [secondsLeft, setSecondsLeft]   = useState(PHASE_DURATION_SEC['work'])
  const [running, setRunning]           = useState(false)
  const [cycleCount, setCycleCount]     = useState(0)   // 완료된 work 세션 수
  const [sessionPomodoros, setSessionPomodoros] = useState(0)  // 이번 앱 실행 중 완료 수
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 통계 ───────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<PomodoroStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadStats = useCallback(() => {
    setStatsLoading(true)
    window.api.pomodoro.getStats()
      .then((s: PomodoroStats) => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    loadStats()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loadStats])

  // ── 타이머 틱 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          handlePhaseEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [running, phase])

  function handlePhaseEnd(): void {
    setRunning(false)
    if (phase === 'work') {
      const newCycle = cycleCount + 1
      setCycleCount(newCycle)
      setSessionPomodoros(p => p + 1)
      // 시스템 알림
      new Notification('🍅 집중 완료!', {
        body: newCycle % LONG_BREAK_EVERY === 0
          ? `${newCycle}번째 포모도로! 긴 휴식을 취하세요.`
          : '짧은 휴식 시간입니다.',
        silent: false,
      })
      // 통계 저장
      window.api.pomodoro.saveSession({
        date: todayStr(),
        completedPomodoros: 1,
        totalFocusMinutes: Math.floor(PHASE_DURATION_SEC['work'] / 60),
      }).then(() => loadStats()).catch(() => {})
      // 다음 페이즈 결정
      const nextPhase: PomodoroPhase = newCycle % LONG_BREAK_EVERY === 0 ? 'long-break' : 'short-break'
      setPhase(nextPhase)
      setSecondsLeft(PHASE_DURATION_SEC[nextPhase])
    } else {
      // 휴식 완료 → 작업으로
      new Notification('⏱️ 휴식 완료!', { body: '다시 집중 시간입니다.' })
      setPhase('work')
      setSecondsLeft(PHASE_DURATION_SEC['work'])
    }
  }

  const handleToggle = (): void => setRunning(r => !r)

  const handleReset = (): void => {
    setRunning(false)
    setSecondsLeft(PHASE_DURATION_SEC[phase])
  }

  const handleSkip = (): void => {
    setRunning(false)
    handlePhaseEnd()
  }

  const handleSwitchPhase = (p: PomodoroPhase): void => {
    setRunning(false)
    setPhase(p)
    setSecondsLeft(PHASE_DURATION_SEC[p])
  }

  // ── 원형 프로그레스 ────────────────────────────────────────────────────────
  const total     = PHASE_DURATION_SEC[phase]
  const progress  = (total - secondsLeft) / total
  const radius    = 70
  const circum    = 2 * Math.PI * radius
  const dashOffset = circum * (1 - progress)
  const color     = PHASE_COLOR[phase]

  // ── 통계 계산 ──────────────────────────────────────────────────────────────
  const days = last7Days()
  const sessionMap = new Map<string, PomodoroSession>(
    (stats?.sessions ?? []).map(s => [s.date, s])
  )
  const todaySession = sessionMap.get(todayStr())

  return (
    <Modal title="포모도로 타이머" onClose={onClose} asPanel={asPanel}>
      {/* 탭 */}
      <div className="flex gap-1 mb-4">
        {(['timer', 'stats'] as const).map(t => (
          <button
            key={t}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === t ? 'bg-[#0078d4] text-white' : ''}`}
            style={tab !== t ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab(t)}
          >
            {t === 'timer' ? '⏱ 타이머' : '📊 통계'}
          </button>
        ))}
      </div>

      {/* ── 타이머 탭 ─────────────────────────────────────────────────────── */}
      {tab === 'timer' && (
        <div className="flex flex-col items-center gap-5">
          {/* 페이즈 전환 버튼 */}
          <div className="flex gap-2">
            {(['work', 'short-break', 'long-break'] as const).map(p => (
              <button
                key={p}
                className="text-xs px-3 py-1 rounded-full border transition-colors"
                style={phase === p
                  ? { background: `${PHASE_COLOR[p]}22`, borderColor: PHASE_COLOR[p], color: PHASE_COLOR[p] }
                  : { borderColor: 'var(--win-border)', color: 'var(--win-text-muted)' }
                }
                onClick={() => handleSwitchPhase(p)}
              >
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>

          {/* 원형 타이머 */}
          <div style={{ position: 'relative', width: 176, height: 176 }}>
            <svg width={176} height={176} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={88} cy={88} r={radius} fill="none" stroke={rgba(T.fg, 0.06)} strokeWidth={10} />
              <circle
                cx={88} cy={88} r={radius} fill="none"
                stroke={color} strokeWidth={10}
                strokeDasharray={circum}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4,
            }}>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{PHASE_LABEL[phase]}</span>
              <span style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--win-text)' }}>
                {fmtTime(secondsLeft)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>
                #{cycleCount + 1} 포모도로
              </span>
            </div>
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex gap-3">
            <button
              className="win-btn-primary text-sm px-6"
              style={{ background: running ? rgba(T.fg, 0.3) : color }}
              onClick={handleToggle}
            >
              {running ? '⏸ 일시정지' : '▶ 시작'}
            </button>
            <button className="win-btn-secondary text-xs" onClick={handleReset}>↺ 리셋</button>
            <button className="win-btn-secondary text-xs" onClick={handleSkip}>⏭ 건너뛰기</button>
          </div>

          {/* 오늘 요약 */}
          <div className="rounded-lg p-3 w-full" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--win-text-muted)' }}>오늘</div>
            <div className="flex gap-4 text-sm">
              <span>
                <b style={{ color: color }}>{(todaySession?.completedPomodoros ?? 0) + sessionPomodoros}</b>
                <span style={{ color: 'var(--win-text-muted)', marginLeft: 3 }}>포모도로</span>
              </span>
              <span>
                <b style={{ color: 'var(--win-text)' }}>
                  {(todaySession?.totalFocusMinutes ?? 0) + sessionPomodoros * Math.floor(PHASE_DURATION_SEC['work'] / 60)}분
                </b>
                <span style={{ color: 'var(--win-text-muted)', marginLeft: 3 }}>집중</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 통계 탭 ─────────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div className="space-y-4">
          {statsLoading && (
            <div style={{ color: 'var(--win-text-muted)', fontSize: 12, textAlign: 'center' }}>로딩 중…</div>
          )}

          {/* 7일 바 차트 */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--win-text-muted)' }}>최근 7일 포모도로</div>
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {days.map(date => {
                const s = sessionMap.get(date)
                const count = s?.completedPomodoros ?? 0
                const max = Math.max(...days.map(d => sessionMap.get(d)?.completedPomodoros ?? 0), 1)
                const barH = Math.max(4, Math.round((count / max) * 64))
                const isToday = date === todayStr()
                return (
                  <div key={date} className="flex flex-col items-center flex-1 gap-1">
                    <span style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{count || ''}</span>
                    <div style={{
                      width: '100%', height: barH, borderRadius: 3,
                      background: isToday ? T.danger : rgba(T.fg, 0.15),
                      transition: 'height 0.3s ease',
                    }} />
                    <span style={{ fontSize: 9, color: isToday ? 'var(--win-text)' : 'var(--win-text-muted)' }}>
                      {weekLabel(date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 합계 */}
          <div className="rounded-lg p-3" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--win-text-muted)' }}>7일 합계</div>
            <div className="flex gap-4 text-sm">
              <span>
                <b style={{ color: T.danger }}>
                  {days.reduce((a, d) => a + (sessionMap.get(d)?.completedPomodoros ?? 0), 0)}
                </b>
                <span style={{ color: 'var(--win-text-muted)', marginLeft: 3 }}>포모도로</span>
              </span>
              <span>
                <b style={{ color: 'var(--win-text)' }}>
                  {days.reduce((a, d) => a + (sessionMap.get(d)?.totalFocusMinutes ?? 0), 0)}분
                </b>
                <span style={{ color: 'var(--win-text-muted)', marginLeft: 3 }}>집중</span>
              </span>
            </div>
          </div>

          <button
            className="win-btn-secondary text-xs"
            onClick={async () => {
              if (!window.confirm('통계를 모두 초기화하시겠습니까?')) return
              await window.api.pomodoro.clearStats()
              loadStats()
            }}
          >
            🗑 통계 초기화
          </button>
        </div>
      )}
    </Modal>
  )
}
