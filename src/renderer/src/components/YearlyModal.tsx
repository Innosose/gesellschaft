import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba, getCurrentTheme } from '../utils/theme'
import { useLocalStorage } from '../utils/hooks'
import { STORAGE_KEYS } from '../../../shared/constants'

interface Event { id: number; date: string; title: string; color: string }

const COLORS = [T.teal, T.gold, T.danger, T.success, T.warning, T.fg]
let eid = 1

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function daysInMonth(year: number, month: number): number { return new Date(year, month + 1, 0).getDate() }
function firstDayOfMonth(year: number, month: number): number { return new Date(year, month, 1).getDay() }

export default function YearlyModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [events, setEvents] = useLocalStorage<Event[]>(STORAGE_KEYS.yearly, [])
  if (events.length > 0 && eid <= Math.max(...events.map(e => e.id))) eid = Math.max(...events.map(e => e.id)) + 1
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {}
    events.forEach(e => { (map[e.date] ??= []).push(e) })
    return map
  }, [events])

  const addEvent = useCallback(() => {
    if (!newTitle.trim() || !newDate) return
    const ev: Event = { id: eid++, date: newDate, title: newTitle.trim(), color: newColor }
    const next = [...events, ev]; setEvents(next)
    setNewTitle('')
  }, [newTitle, newDate, newColor, events])

  const removeEvent = useCallback((id: number) => {
    const next = events.filter(e => e.id !== id); setEvents(next)
  }, [events])

  const today = new Date().toISOString().slice(0, 10)

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  const renderMiniMonth = (month: number) => {
    const days = daysInMonth(year, month)
    const first = firstDayOfMonth(year, month)
    const isSelected = selectedMonth === month
    return (
      <div key={month} onClick={() => setSelectedMonth(isSelected ? null : month)} style={{
        padding: 6, borderRadius: 4, cursor: 'pointer',
        background: isSelected ? rgba(T.teal, 0.06) : rgba(T.gold, 0.02),
        border: `1px solid ${isSelected ? rgba(T.teal, 0.2) : rgba(T.gold, 0.04)}`,
        transition: 'all 0.15s ease',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? T.teal : rgba(T.gold, 0.6), marginBottom: 4, textAlign: 'center' }}>{MONTHS[month]}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {Array.from({ length: first }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const hasEvent = eventsByDate[dateStr]
            const isToday = dateStr === today
            return (
              <div key={d} style={{
                width: 12, height: 12, borderRadius: 2, fontSize: 6, lineHeight: '12px', textAlign: 'center',
                background: hasEvent ? `${hasEvent[0].color}30` : isToday ? rgba(T.teal, 0.12) : 'transparent',
                color: isToday ? T.teal : hasEvent ? hasEvent[0].color : rgba(T.fg, 0.25),
                fontWeight: isToday ? 700 : 400,
                border: isToday ? `1px solid ${rgba(T.teal, 0.3)}` : 'none',
              }}>{d}</div>
            )
          })}
        </div>
      </div>
    )
  }

  const monthEvents = selectedMonth !== null
    ? events.filter(e => { const m = new Date(e.date).getMonth(); return m === selectedMonth && e.date.startsWith(String(year)) }).sort((a, b) => a.date.localeCompare(b.date))
    : []

  return (
    <Modal title="Yearly" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
        {/* Year nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={() => setYear(y => y - 1)} style={{ background: 'none', border: 'none', color: rgba(T.gold, 0.6), cursor: 'pointer', fontSize: 14 }}>&lt;</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: rgba(T.fg, 0.8), fontFamily: getCurrentTheme().titleFont }}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={{ background: 'none', border: 'none', color: rgba(T.gold, 0.6), cursor: 'pointer', fontSize: 14 }}>&gt;</button>
        </div>

        {/* 12 months grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {Array.from({ length: 12 }, (_, i) => renderMiniMonth(i))}
        </div>

        {/* Selected month detail */}
        {selectedMonth !== null && (
          <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.08)}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: rgba(T.gold, 0.6) }}>{MONTHS[selectedMonth]} 일정</div>
            {monthEvents.length > 0 ? monthEvents.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: rgba(T.fg, 0.4), whiteSpace: 'nowrap' }}>{e.date.slice(5)}</span>
                <span style={{ flex: 1, fontSize: 12, color: rgba(T.fg, 0.75) }}>{e.title}</span>
                <button onClick={() => removeEvent(e.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.4), cursor: 'pointer', fontSize: 11 }}>x</button>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: rgba(T.fg, 0.25), textAlign: 'center', padding: 10 }}>일정이 없습니다</div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...inputStyle, width: 130 }} />
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEvent()} placeholder="일정 제목" style={{ ...inputStyle, flex: 1, minWidth: 100 }} />
              <div style={{ display: 'flex', gap: 3 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setNewColor(c)} style={{ width: 14, height: 14, borderRadius: 3, background: c, cursor: 'pointer', border: newColor === c ? `2px solid ${rgba(T.fg, 0.6)}` : `1px solid ${rgba(T.fg, 0.1)}` }} />
                ))}
              </div>
              <button onClick={addEvent} style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
