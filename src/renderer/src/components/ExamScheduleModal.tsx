import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

interface Exam {
  id: number
  name: string
  subject: string
  date: string
  memo: string
}

const STORAGE_KEY = 'gs-exam-schedule'
let nextId = 1

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): Exam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Exam[]
    nextId = Math.max(...items.map(e => e.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: Exam[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function dDay(dateStr: string): number {
  const now = new Date(todayStr())
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function dDayLabel(d: number): string {
  if (d === 0) return 'D-Day'
  if (d > 0) return `D-${d}`
  return `D+${Math.abs(d)}`
}

function dDayColor(d: number): string {
  if (d < 0) return 'var(--win-text-muted)'
  if (d === 0) return T.danger
  if (d <= 3) return T.warning
  if (d <= 7) return T.warning
  return T.success
}

export default function ExamScheduleModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [exams, setExams] = useState<Exam[]>(load)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('')
  const [memo, setMemo] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => { save(exams) }, [exams])

  const sorted = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date)), [exams])

  const addOrUpdate = (): void => {
    if (!name.trim() || !date) return
    if (editId !== null) {
      setExams(prev => prev.map(e => e.id === editId ? { ...e, name: name.trim(), subject: subject.trim(), date, memo: memo.trim() } : e))
      setEditId(null)
    } else {
      setExams(prev => [...prev, { id: nextId++, name: name.trim(), subject: subject.trim(), date, memo: memo.trim() }])
    }
    setName(''); setSubject(''); setDate(''); setMemo('')
  }

  const startEdit = (e: Exam): void => {
    setEditId(e.id); setName(e.name); setSubject(e.subject); setDate(e.date); setMemo(e.memo)
  }

  const remove = (id: number): void => {
    setExams(prev => prev.filter(e => e.id !== id))
    if (editId === id) { setEditId(null); setName(''); setSubject(''); setDate(''); setMemo('') }
  }

  return (
    <Modal title="시험 일정 관리" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 입력 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>시험명</label>
            <input className="win-input" value={name} onChange={e => setName(e.target.value)} placeholder="중간고사" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>과목</label>
            <input className="win-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="수학" style={{ width: '100%' }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>날짜</label>
            <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <button className="win-btn-primary" onClick={addOrUpdate} style={{ height: 34 }}>{editId !== null ? '수정' : '추가'}</button>
          {editId !== null && <button className="win-btn-ghost" onClick={() => { setEditId(null); setName(''); setSubject(''); setDate(''); setMemo('') }} style={{ height: 34 }}>취소</button>}
        </div>
        <div>
          <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)" style={{ width: '100%' }} />
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>시험 일정을 추가하세요</div>
          )}
          {sorted.map(e => {
            const d = dDay(e.date)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ minWidth: 60, textAlign: 'center', fontSize: 16, fontWeight: 700, color: dDayColor(d) }}>{dDayLabel(d)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{e.subject && `${e.subject} · `}{e.date}{e.memo && ` · ${e.memo}`}</div>
                </div>
                <button className="win-btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => startEdit(e)}>편집</button>
                <button className="win-btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => remove(e.id)}>삭제</button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
