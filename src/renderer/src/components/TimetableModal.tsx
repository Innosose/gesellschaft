import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const DAYS = ['월', '화', '수', '목', '금'] as const
const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const
const STORAGE_KEY = 'gesellschaft-timetable'

const SUBJECT_COLORS: Record<string, string> = {
  국어: T.danger, 영어: T.teal, 수학: T.warning, 과학: T.success, 사회: T.gold,
  한국사: T.warning, 물리: T.teal, 화학: T.success, 생물: T.success, 지구과학: T.teal,
  음악: T.danger, 미술: T.warning, 체육: T.success, 기술: T.fg, 가정: T.gold,
  정보: T.teal, 도덕: T.gold, 일본어: T.warning, 중국어: T.danger, 독일어: T.gold,
}

function getColor(subject: string): string {
  if (!subject) return 'transparent'
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject]
  let hash = 0
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

type Cell = { subject: string; room: string }
type Table = Record<string, Cell>

function key(day: string, period: number): string { return `${day}-${period}` }

function loadTable(): Table {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

export default function TimetableModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [table, setTable] = useState<Table>(loadTable)
  const [editing, setEditing] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editRoom, setEditRoom] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(table)) }, [table])

  const startEdit = useCallback((k: string) => {
    const cell = table[k]
    setEditSubject(cell?.subject ?? '')
    setEditRoom(cell?.room ?? '')
    setEditing(k)
  }, [table])

  const saveEdit = useCallback(() => {
    if (!editing) return
    setTable(prev => {
      const next = { ...prev }
      if (!editSubject.trim()) { delete next[editing]; return next }
      next[editing] = { subject: editSubject.trim(), room: editRoom.trim() }
      return next
    })
    setEditing(null)
  }, [editing, editSubject, editRoom])

  const clearAll = useCallback(() => { setTable({}); setEditing(null) }, [])

  // 오늘 요일 하이라이트 (0=일, 1=월, ...)
  const todayIdx = new Date().getDay() - 1 // 0=월 ~ 4=금

  return (
    <Modal title="시간표" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>칸을 클릭하여 과목을 입력하세요</span>
          <button className="win-btn-ghost" style={{ fontSize: 11 }} onClick={clearAll}>전체 초기화</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 36, padding: '8px 4px', fontSize: 11, color: 'var(--win-text-muted)', borderBottom: '2px solid var(--win-border)' }} />
                {DAYS.map((d, i) => (
                  <th key={d} style={{
                    padding: '8px 4px', fontSize: 13, fontWeight: 700,
                    color: i === todayIdx ? 'var(--win-accent)' : 'var(--win-text)',
                    borderBottom: `2px solid ${i === todayIdx ? 'var(--win-accent)' : 'var(--win-border)'}`,
                    background: i === todayIdx ? 'rgba(139,92,246,0.08)' : 'transparent',
                  }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p}>
                  <td style={{ padding: '4px', fontSize: 11, color: 'var(--win-text-muted)', textAlign: 'center', borderRight: '1px solid var(--win-border)' }}>
                    {p}교시
                  </td>
                  {DAYS.map((d, di) => {
                    const k = key(d, p)
                    const cell = table[k]
                    const color = getColor(cell?.subject ?? '')
                    const isEditing = editing === k
                    return (
                      <td
                        key={k}
                        onClick={() => !isEditing && startEdit(k)}
                        style={{
                          padding: 3, cursor: isEditing ? 'default' : 'pointer',
                          border: '1px solid var(--win-border)',
                          background: di === todayIdx ? 'rgba(139,92,246,0.04)' : 'transparent',
                          verticalAlign: 'top', height: 52,
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <input
                              autoFocus
                              className="win-input"
                              value={editSubject}
                              onChange={e => setEditSubject(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                              placeholder="과목"
                              style={{ fontSize: 11, padding: '2px 4px', height: 22 }}
                            />
                            <input
                              className="win-input"
                              value={editRoom}
                              onChange={e => setEditRoom(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                              placeholder="교실"
                              style={{ fontSize: 10, padding: '2px 4px', height: 20 }}
                            />
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button className="win-btn-primary" style={{ fontSize: 9, padding: '1px 6px', flex: 1 }} onClick={saveEdit}>확인</button>
                              <button className="win-btn-ghost" style={{ fontSize: 9, padding: '1px 6px' }} onClick={() => setEditing(null)}>취소</button>
                            </div>
                          </div>
                        ) : cell ? (
                          <div style={{
                            padding: '4px 6px', borderRadius: 6, height: '100%',
                            background: `${color}18`, borderLeft: `3px solid ${color}`,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-text)' }}>{cell.subject}</div>
                            {cell.room && <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 2 }}>{cell.room}</div>}
                          </div>
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 16, color: rgba(T.fg, 0.08) }}>+</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
