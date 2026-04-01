import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Note {
  id: number
  subject: string
  date: string
  title: string
  content: string
}

const STORAGE_KEY = 'gs-lecture-notes'
let nextId = 1

function load(): { notes: Note[]; subjects: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { notes: [], subjects: ['일반'] }
    const data = JSON.parse(raw)
    nextId = Math.max(...(data.notes || []).map((n: Note) => n.id), 0) + 1
    return { notes: data.notes || [], subjects: data.subjects?.length ? data.subjects : ['일반'] }
  } catch { return { notes: [], subjects: ['일반'] } }
}

function save(notes: Note[], subjects: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, subjects }))
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LectureNoteModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const initial = load()
  const [notes, setNotes] = useState<Note[]>(initial.notes)
  const [subjects, setSubjects] = useState<string[]>(initial.subjects)
  const [activeSubject, setActiveSubject] = useState(initial.subjects[0] || '일반')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(todayStr())
  const [newSubject, setNewSubject] = useState('')

  useEffect(() => { save(notes, subjects) }, [notes, subjects])

  const filtered = useMemo(() => {
    let list = notes.filter(n => n.subject === activeSubject)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [notes, activeSubject, search])

  const addSubject = (): void => {
    if (!newSubject.trim() || subjects.includes(newSubject.trim())) return
    setSubjects(prev => [...prev, newSubject.trim()])
    setActiveSubject(newSubject.trim())
    setNewSubject('')
  }

  const saveNote = (): void => {
    if (!title.trim()) return
    if (editing) {
      setNotes(prev => prev.map(n => n.id === editing.id ? { ...n, title: title.trim(), content, date } : n))
    } else {
      setNotes(prev => [...prev, { id: nextId++, subject: activeSubject, date, title: title.trim(), content }])
    }
    setEditing(null); setTitle(''); setContent(''); setDate(todayStr())
  }

  const startEdit = (n: Note): void => {
    setEditing(n); setTitle(n.title); setContent(n.content); setDate(n.date)
  }

  const remove = (id: number): void => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (editing?.id === id) { setEditing(null); setTitle(''); setContent('') }
  }

  const removeSubject = (s: string): void => {
    if (subjects.length <= 1) return
    setNotes(prev => prev.filter(n => n.subject !== s))
    setSubjects(prev => prev.filter(x => x !== s))
    if (activeSubject === s) setActiveSubject(subjects.find(x => x !== s) || subjects[0])
  }

  return (
    <Modal title="강의 노트" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 과목 탭 */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {subjects.map(s => (
            <button key={s} onClick={() => setActiveSubject(s)} onDoubleClick={() => { if (confirm(`"${s}" 과목과 노트를 삭제할까요?`)) removeSubject(s) }} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeSubject === s ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: activeSubject === s ? T.fg : rgba(T.fg, 0.45),
            }}>{s}</button>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <input className="win-input" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()} placeholder="+ 과목" style={{ width: 80, fontSize: 11 }} />
          </div>
        </div>

        {/* 검색 */}
        <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="노트 검색..." style={{ width: '100%' }} />

        {/* 입력/편집 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" style={{ flex: 1 }} />
            <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 140 }} />
          </div>
          <textarea className="win-input" value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 입력하세요...&#10;**굵게** *기울임* - 목록" rows={4} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="win-btn-primary" onClick={saveNote} style={{ fontSize: 12 }}>{editing ? '수정 완료' : '노트 추가'}</button>
            {editing && <button className="win-btn-ghost" onClick={() => { setEditing(null); setTitle(''); setContent(''); setDate(todayStr()) }} style={{ fontSize: 12 }}>취소</button>}
          </div>
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>노트가 없습니다</div>}
          {filtered.map(n => (
            <div key={n.id} style={{ padding: '10px 14px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }} onClick={() => startEdit(n)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{n.title}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{n.date}</span>
                  <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={e => { e.stopPropagation(); remove(n.id) }}>×</button>
                </div>
              </div>
              {n.content && <div style={{ fontSize: 12, color: 'var(--win-text-sub)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{n.content.slice(0, 150)}</div>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
