import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const QUOTES = [
  '작은 진전도 진전이다.',
  '시작이 반이다.',
  '꾸준함이 재능을 이긴다.',
  '오늘 하루도 최선을 다하자.',
  '실패는 성공의 어머니.',
  '천리길도 한 걸음부터.',
  '노력은 배신하지 않는다.',
  '오늘의 노력이 내일의 실력이 된다.',
  '포기하지 않으면 실패는 없다.',
  '배움에 끝은 없다.',
  '변화는 작은 습관에서 시작된다.',
  '지금 이 순간이 가장 빠르다.',
  '할 수 있다고 믿으면 할 수 있다.',
  '성장은 불편함 속에서 이루어진다.',
  '매일 1%씩 성장하자.',
  '집중은 최고의 무기다.',
  '준비된 자에게 기회가 온다.',
  '인내는 쓰지만 열매는 달다.',
  '오늘의 나는 어제보다 낫다.',
  '끝까지 해봐야 안다.',
  '작심삼일도 열두 번이면 일 년이다.',
  '남과 비교하지 말고 어제의 나와 비교하라.',
  '미루지 말자, 지금 시작하자.',
  '꿈은 도망가지 않는다. 도망가는 것은 나 자신이다.',
  '위대한 것은 작은 것들의 축적이다.',
  '느려도 괜찮다. 멈추지만 않으면 된다.',
  '목표를 잊지 말자.',
  '지식은 가장 좋은 투자다.',
  '최선을 다한 하루에 후회는 없다.',
  '나는 할 수 있다.',
  '기적은 노력하는 사람에게 일어난다.',
]

function todayStr(): string { return new Date().toISOString().slice(0, 10) }
function todayDay(): string {
  return new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

function safeParse<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}

interface BriefSection { label: string; value: string; color: string; icon: string }

export default function DailyBriefModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const sections = useMemo((): BriefSection[] => {
    const result: BriefSection[] = []

    // Todos
    const todos = safeParse<{ done?: boolean }[]>('gs-todos', [])
    const pending = todos.filter(t => !t.done).length
    const total = todos.length
    result.push({
      label: '할 일', value: pending > 0 ? `${pending}개 남음 (총 ${total}개)` : total > 0 ? '모두 완료!' : '없음',
      color: pending > 0 ? T.warning : T.teal, icon: '📋'
    })

    // D-Day
    const ddays = safeParse<{ name: string; target: string }[]>('gs-dday', [])
    const upcoming = ddays
      .map(d => ({ name: d.name, diff: Math.ceil((new Date(d.target).getTime() - Date.now()) / 86400000) }))
      .filter(d => d.diff >= 0)
      .sort((a, b) => a.diff - b.diff)
    if (upcoming.length > 0) {
      const next = upcoming[0]
      result.push({
        label: 'D-Day', value: next.diff === 0 ? `${next.name} — 오늘!` : `${next.name} — D-${next.diff}`,
        color: next.diff <= 3 ? T.danger : T.gold, icon: '📅'
      })
    }

    // Study streak
    const streak = safeParse<{ currentStreak?: number }>('gs-study-streak', {})
    if (streak.currentStreak != null) {
      result.push({
        label: '공부 스트릭', value: `${streak.currentStreak}일 연속`,
        color: T.teal, icon: '🔥'
      })
    }

    // Study time
    const studyLog = safeParse<Record<string, number>>('gs-study-log', {})
    const todayMin = studyLog[todayStr()] || 0
    result.push({
      label: '오늘 공부', value: todayMin > 0 ? `${Math.floor(todayMin / 60)}시간 ${todayMin % 60}분` : '기록 없음',
      color: todayMin > 0 ? T.teal : 'var(--win-text-muted)', icon: '⏱️'
    })

    // Break timer sessions
    const breakTimer = safeParse<{ sessions?: number; lastDate?: string }>('gs-break-timer', {})
    if (breakTimer.lastDate === todayStr() && breakTimer.sessions) {
      result.push({
        label: '집중 세션', value: `${breakTimer.sessions}회 완료`,
        color: T.gold, icon: '🎯'
      })
    }

    // Countdowns
    const countdowns = safeParse<{ name: string; target: string }[]>('gs-countdowns', [])
    const activeCountdowns = countdowns.filter(c => new Date(c.target).getTime() > Date.now())
    if (activeCountdowns.length > 0) {
      result.push({
        label: '카운트다운', value: `${activeCountdowns.length}개 진행 중`,
        color: T.teal, icon: '⏳'
      })
    }

    return result
  }, [])

  return (
    <Modal title="일일 브리핑" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-4">
        {/* Date + quote */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.gold, marginBottom: 2 }}>
            {todayDay()}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--win-text-muted)', fontStyle: 'italic',
            marginTop: 6, padding: '8px 16px', borderRadius: 6,
            background: rgba(T.gold, 0.06), border: `1px solid ${rgba(T.gold, 0.1)}`
          }}>
            &ldquo;{getDailyQuote()}&rdquo;
          </div>
        </div>

        {/* Current time */}
        <div style={{ textAlign: 'center' }}>
          <TimeDisplay />
        </div>

        {/* Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sections.map((s, i) => (
            <div key={i} style={{
              background: rgba(T.gold, 0.05), borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${rgba(T.gold, 0.1)}`
            }}>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 4 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {sections.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 12, padding: 20 }}>
            아직 데이터가 없습니다. 다른 도구를 사용하면 여기에 요약이 표시됩니다.
          </div>
        )}

        <p style={{ fontSize: 10, color: 'var(--win-text-muted)', textAlign: 'center' }}>
          다른 도구의 localStorage 데이터를 읽어 요약합니다 (읽기 전용)
        </p>
      </div>
    </Modal>
  )
}

function TimeDisplay(): React.ReactElement {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: T.teal }}>
      {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}
