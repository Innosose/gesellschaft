import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Status = 'not-started' | 'in-progress' | 'done'

interface Assignment {
  id: number
  course: string
  title: string
  dueDate: string
  status: Status
  files: string[]
  memo: string
}

const STORAGE_KEY = 'gs-assignments'
const STATUS_LABELS: Record<Status, string> = { 'not-started': '미착수', 'in-progress': '진행 중', done: '완료' }
const STATUS_COLORS: Record<Status, string> = { 'not-started': T.danger, 'in-progress': T.warning, done: T.success }
let nextId = 1

function load(): Assignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Assignment[]
    nextId = Math.max(...items.map(a => a.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: Assignment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const now = new Date(todayStr())
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function AssignmentModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [assignments, setAssignments] = useState<Assignment[]>(load)
  const [course, setCourse] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [fileName, setFileName] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('all')

  useEffect(() => { save(assignments) }, [assignments])

  const filtered = useMemo(() => {
    let list = assignments
    if (filter !== 'all') list = list.filter(a => a.status === filter)
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [assignments, filter])

  const addFile = (): void => {
    if (!fileName.trim()) return
    setFiles(prev => [...prev, fileName.trim()])
    setFileName('')
  }

  const addAssignment = (): void => {
    if (!title.trim() || !dueDate) return
    setAssignments(prev => [...prev, { id: nextId++, course: course.trim(), title: title.trim(), dueDate, status: 'not-started', files: [...files], memo: memo.trim() }])
    setCourse(''); setTitle(''); setDueDate(''); setMemo(''); setFiles([])
  }

  const updateStatus = (id: number, status: Status): void => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const remove = (id: number): void => {
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  const stats = useMemo(() => ({
    total: assignments.length,
    done: assignments.filter(a => a.status === 'done').length,
    overdue: assignments.filter(a => a.status !== 'done' && daysUntil(a.dueDate) < 0).length,
  }), [assignments])

  return (
    <Modal title="과제 관리" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 통계 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: '전체', value: stats.total, color: 'var(--win-text)' },
            { label: '완료', value: stats.done, color: T.success },
            { label: '기한 초과', value: stats.overdue, color: T.danger },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="win-input" value={course} onChange={e => setCourse(e.target.value)} placeholder="과목명" style={{ width: 100 }} />
            <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="과제 제목" style={{ flex: 1 }} />
            <input className="win-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: 140 }} />
          </div>
          <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)" style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={fileName} onChange={e => setFileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFile()} placeholder="첨부파일명 (Enter)" style={{ flex: 1 }} />
            {files.length > 0 && <span style={{ fontSize: 11, color: 'var(--win-text-muted)', alignSelf: 'center' }}>{files.join(', ')}</span>}
          </div>
          <button className="win-btn-primary" onClick={addAssignment} style={{ alignSelf: 'flex-start', fontSize: 12 }}>과제 추가</button>
        </div>

        {/* 필터 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'not-started', 'in-progress', 'done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filter === f ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: filter === f ? T.fg : rgba(T.fg, 0.45),
            }}>{f === 'all' ? '전체' : STATUS_LABELS[f]}</button>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>과제가 없습니다</div>}
          {filtered.map(a => {
            const d = daysUntil(a.dueDate)
            const overdue = a.status !== 'done' && d < 0
            return (
              <div key={a.id} style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: `1px solid ${overdue ? rgba(T.danger, 0.4) : 'var(--win-border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${STATUS_COLORS[a.status]}22`, color: STATUS_COLORS[a.status] }}>{STATUS_LABELS[a.status]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{a.title}</span>
                  </div>
                  <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => remove(a.id)}>×</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6 }}>
                  {a.course && `${a.course} · `}마감: {a.dueDate} ({d >= 0 ? `D-${d}` : `${Math.abs(d)}일 초과`})
                  {a.memo && ` · ${a.memo}`}
                </div>
                {a.files.length > 0 && <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 4 }}>첨부: {a.files.join(', ')}</div>}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['not-started', 'in-progress', 'done'] as Status[]).map(s => (
                    <button key={s} onClick={() => updateStatus(a.id, s)} className={a.status === s ? 'win-btn-primary' : 'win-btn-ghost'} style={{ padding: '2px 8px', fontSize: 10 }}>{STATUS_LABELS[s]}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
