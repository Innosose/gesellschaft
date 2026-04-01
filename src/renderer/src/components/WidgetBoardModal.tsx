import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const STORAGE_KEY = 'gs-widget-board'

interface WidgetData { weather: string; memo: string; quote: string }

const QUOTES = [
  '오늘 하루도 화이팅!',
  '포기하지 마, 넌 할 수 있어.',
  '작은 진전도 여전히 진전이다.',
  '실패는 성공의 어머니.',
  '꾸준함이 재능을 이긴다.',
  '지금 이 순간이 가장 빠르다.',
  '노력은 배신하지 않는다.',
  '어제보다 나은 오늘을 만들자.',
  '천리 길도 한 걸음부터.',
  '할 수 있다고 믿으면 이미 반은 온 것이다.',
]

function load(): WidgetData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { weather: '', memo: '', quote: QUOTES[0] }
  } catch { return { weather: '', memo: '', quote: QUOTES[0] } }
}

function getTodoCount(): number {
  try {
    // Try multiple possible todo storage keys
    for (const key of ['gesellschaft-todos', 'gs-todos', 'todo-items']) {
      const raw = localStorage.getItem(key)
      if (raw) {
        const items = JSON.parse(raw)
        if (Array.isArray(items)) return items.filter((t: any) => !t.done && !t.completed).length
      }
    }
    return 0
  } catch { return 0 }
}

export default function WidgetBoardModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [data, setData] = useState<WidgetData>(load)
  const [now, setNow] = useState(new Date())
  const [todoCount, setTodoCount] = useState(getTodoCount)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, [data])
  useEffect(() => { const t = setInterval(() => setTodoCount(getTodoCount()), 5000); return () => clearInterval(t) }, [])

  const randomQuote = useCallback(() => {
    setData(prev => ({ ...prev, quote: QUOTES[Math.floor(Math.random() * QUOTES.length)] }))
  }, [])

  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  // Progress through the day
  const dayProgress = ((now.getHours() * 60 + now.getMinutes()) / 1440 * 100).toFixed(1)

  return (
    <Modal title="위젯 보드" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* Clock widget */}
        <div style={{ padding: 20, borderRadius: 12, background: `linear-gradient(135deg, ${rgba(T.teal, 0.1)}, ${rgba(T.teal, 0.05)})`, border: `1px solid ${rgba(T.teal, 0.2)}`, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.teal, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>{timeStr}</div>
          <div style={{ fontSize: 13, color: 'var(--win-text-sub)', marginTop: 4 }}>{dateStr}</div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: rgba(T.fg, 0.1) }}>
              <div style={{ width: `${dayProgress}%`, height: '100%', borderRadius: 2, background: T.teal, transition: 'width 1s' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{dayProgress}%</span>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
          {/* Todo count */}
          <div style={{ padding: 14, borderRadius: 12, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>남은 할 일</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: todoCount > 0 ? T.warning : T.success }}>{todoCount}</div>
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>{todoCount === 0 ? '모두 완료!' : '개 남음'}</div>
          </div>

          {/* Weather */}
          <div style={{ padding: 14, borderRadius: 12, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>날씨 메모</div>
            <input className="win-input" value={data.weather} onChange={e => setData(prev => ({ ...prev, weather: e.target.value }))} placeholder="오늘 날씨..." style={{ fontSize: 12 }} />
          </div>

          {/* Quick memo */}
          <div style={{ padding: 14, borderRadius: 12, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>빠른 메모</div>
            <textarea className="win-input" value={data.memo} onChange={e => setData(prev => ({ ...prev, memo: e.target.value }))} placeholder="메모를 입력하세요..." style={{ flex: 1, resize: 'none', fontSize: 12, minHeight: 60 }} />
          </div>

          {/* Motivational quote */}
          <div style={{ padding: 14, borderRadius: 12, background: `linear-gradient(135deg, ${rgba(T.gold, 0.08)}, ${rgba(T.teal, 0.08)})`, border: `1px solid ${rgba(T.gold, 0.2)}`, gridColumn: '1 / -1', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>오늘의 한마디</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--win-text)', lineHeight: 1.6, marginBottom: 8 }}>"{data.quote}"</div>
            <button className="win-btn-ghost" onClick={randomQuote} style={{ fontSize: 11 }}>다른 명언</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
