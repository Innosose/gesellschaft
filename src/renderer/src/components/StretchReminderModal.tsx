import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface StretchExercise {
  id: number
  name: string
  description: string
  duration: number // seconds
  icon: string
}

interface Routine {
  exerciseIds: number[]
}

const STORAGE_KEY = 'gs-stretch'

const BUILT_IN: StretchExercise[] = [
  { id: 1, name: '목 스트레칭', description: '고개를 좌우로 천천히 기울이기', duration: 30, icon: '[ O ]\n |' },
  { id: 2, name: '어깨 돌리기', description: '양 어깨를 앞뒤로 크게 돌리기', duration: 30, icon: '--O--\n  |' },
  { id: 3, name: '손목 스트레칭', description: '손목을 앞뒤로 꺾어 늘리기', duration: 20, icon: '  O\n /|\\\n(wrist)' },
  { id: 4, name: '허리 비틀기', description: '의자에 앉아 상체를 좌우로 비틀기', duration: 30, icon: '  O\n /|\\\n twist' },
  { id: 5, name: '다리 뻗기', description: '앉아서 다리를 앞으로 쭉 뻗기', duration: 20, icon: '  O\n /|\\\n / \\' },
  { id: 6, name: '눈 운동', description: '눈을 상하좌우로 굴리고 멀리 보기', duration: 20, icon: '(O O)\n eye' },
  { id: 7, name: '가슴 펴기', description: '양팔을 뒤로 모아 가슴 열기', duration: 30, icon: '\\O/\n  |' },
  { id: 8, name: '종아리 스트레칭', description: '벽에 손 짚고 한 발씩 뒤로 밀기', duration: 30, icon: '  O\n /|\\\n / |' },
]

function loadData(): { routine: number[]; history: Record<string, boolean> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { routine: BUILT_IN.map(e => e.id), history: {} }
    return JSON.parse(raw)
  } catch { return { routine: BUILT_IN.map(e => e.id), history: {} } }
}

function saveData(routine: number[], history: Record<string, boolean>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ routine, history }))
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StretchReminderModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const initial = loadData()
  const [routine, setRoutine] = useState<number[]>(initial.routine)
  const [history, setHistory] = useState<Record<string, boolean>>(initial.history)
  const [tab, setTab] = useState<'routine' | 'timer' | 'list'>('routine')
  const [timerIdx, setTimerIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { saveData(routine, history) }, [routine, history])

  const routineExercises = routine.map(id => BUILT_IN.find(e => e.id === id)!).filter(Boolean)

  const startTimer = useCallback(() => {
    if (routineExercises.length === 0) return
    setTimerIdx(0)
    setTimeLeft(routineExercises[0].duration)
    setRunning(true)
    setTab('timer')
  }, [routineExercises])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Next exercise
          setTimerIdx(idx => {
            const next = idx + 1
            if (next >= routineExercises.length) {
              setRunning(false)
              setHistory(prev => ({ ...prev, [todayStr()]: true }))
              return idx
            }
            setTimeLeft(routineExercises[next].duration)
            return next
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, routineExercises])

  const toggleInRoutine = (id: number): void => {
    setRoutine(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const currentExercise = routineExercises[timerIdx]
  const timerDone = !running && timerIdx > 0

  return (
    <Modal title="스트레칭" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'routine' as const, label: '내 루틴' }, { id: 'timer' as const, label: '타이머' }, { id: 'list' as const, label: '운동 목록' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'routine' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>루틴: {routineExercises.length}개 운동, 총 {routineExercises.reduce((s, e) => s + e.duration, 0)}초</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {routineExercises.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--win-text-muted)', minWidth: 20 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{e.duration}초</div>
                  </div>
                  <button className="win-btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => toggleInRoutine(e.id)}>제거</button>
                </div>
              ))}
            </div>
            <button className="win-btn-primary" onClick={startTimer} disabled={routineExercises.length === 0}>루틴 시작</button>
            {history[todayStr()] && <div style={{ fontSize: 12, color: T.success, textAlign: 'center' }}>오늘 스트레칭 완료!</div>}
          </div>
        )}

        {tab === 'timer' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            {timerDone ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F44F;</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-text)' }}>스트레칭 완료!</div>
                <button className="win-btn-primary" onClick={startTimer} style={{ marginTop: 16 }}>다시 하기</button>
              </div>
            ) : currentExercise ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{timerIdx + 1} / {routineExercises.length}</div>
                <pre style={{ fontSize: 24, color: 'var(--win-text-muted)', textAlign: 'center', lineHeight: 1.2, fontFamily: 'monospace' }}>{currentExercise.icon}</pre>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-text)' }}>{currentExercise.name}</div>
                <div style={{ fontSize: 13, color: 'var(--win-text-sub)' }}>{currentExercise.description}</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: T.teal, fontFamily: 'monospace' }}>{timeLeft}</div>
                <button className={running ? 'win-btn-danger' : 'win-btn-primary'} onClick={() => setRunning(!running)}>
                  {running ? '일시정지' : '계속'}
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--win-text-muted)', fontSize: 13 }}>루틴을 시작하세요</div>
            )}
          </div>
        )}

        {tab === 'list' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {BUILT_IN.map(e => {
              const inRoutine = routine.includes(e.id)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{e.description} · {e.duration}초</div>
                  </div>
                  <button className={inRoutine ? 'win-btn-secondary' : 'win-btn-primary'} style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => toggleInRoutine(e.id)}>
                    {inRoutine ? '루틴에서 제거' : '루틴에 추가'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
