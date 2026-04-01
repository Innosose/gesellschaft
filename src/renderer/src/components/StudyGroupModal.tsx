import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Task { id: number; member: string; text: string; done: boolean }
interface Group { id: number; name: string; members: string[]; schedule: string; notes: string; tasks: Task[] }

const STORAGE_KEY = 'gs-study-groups'
let nextId = 1
let nextTaskId = 1

function load(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const g = JSON.parse(raw) as Group[]
    nextId = Math.max(...g.map(x => x.id), 0) + 1
    nextTaskId = Math.max(...g.flatMap(x => x.tasks.map(t => t.id)), 0) + 1
    return g
  } catch { return [] }
}

export default function StudyGroupModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [groups, setGroups] = useState<Group[]>(load)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [taskText, setTaskText] = useState('')
  const [taskMember, setTaskMember] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)) }, [groups])

  const active = groups.find(g => g.id === activeId) ?? null

  const addGroup = useCallback(() => {
    if (!name.trim()) return
    const g: Group = { id: nextId++, name: name.trim(), members: [], schedule: '', notes: '', tasks: [] }
    setGroups(prev => [...prev, g])
    setName(''); setActiveId(g.id)
  }, [name])

  const deleteGroup = useCallback((id: number) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    if (activeId === id) setActiveId(null)
  }, [activeId])

  const update = useCallback((fn: (g: Group) => Group) => {
    if (activeId === null) return
    setGroups(prev => prev.map(g => g.id === activeId ? fn(g) : g))
  }, [activeId])

  const addMember = useCallback(() => {
    if (!memberInput.trim()) return
    update(g => ({ ...g, members: [...g.members, memberInput.trim()] }))
    setMemberInput('')
  }, [memberInput, update])

  const removeMember = useCallback((m: string) => {
    update(g => ({ ...g, members: g.members.filter(x => x !== m) }))
  }, [update])

  const addTask = useCallback(() => {
    if (!taskText.trim() || !taskMember) return
    update(g => ({ ...g, tasks: [...g.tasks, { id: nextTaskId++, member: taskMember, text: taskText.trim(), done: false }] }))
    setTaskText('')
  }, [taskText, taskMember, update])

  const toggleTask = useCallback((tid: number) => {
    update(g => ({ ...g, tasks: g.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) }))
  }, [update])

  const removeTask = useCallback((tid: number) => {
    update(g => ({ ...g, tasks: g.tasks.filter(t => t.id !== tid) }))
  }, [update])

  return (
    <Modal title="스터디 그룹" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {!active ? (
          <>
            {/* Create + list */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="win-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="그룹 이름" style={{ flex: 1 }} />
              <button className="win-btn-primary" onClick={addGroup} style={{ fontSize: 12 }}>만들기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groups.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>스터디 그룹을 만드세요</div>}
              {groups.map(g => (
                <div key={g.id} onClick={() => setActiveId(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--win-text)' }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{g.members.length}명 / 할일 {g.tasks.filter(t => !t.done).length}개</div>
                  </div>
                  <button className="win-btn-danger" onClick={e => { e.stopPropagation(); deleteGroup(g.id) }} style={{ fontSize: 11, padding: '2px 8px' }}>삭제</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="win-btn-ghost" onClick={() => setActiveId(null)} style={{ fontSize: 12 }}>← 목록</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--win-text)' }}>{active.name}</span>
            </div>

            {/* Members */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>멤버</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {active.members.map(m => (
                  <span key={m} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: rgba(T.teal, 0.15), color: T.teal, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {m} <span onClick={() => removeMember(m)} style={{ cursor: 'pointer', opacity: 0.5 }}>x</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="win-input" value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} placeholder="이름" style={{ flex: 1 }} />
                <button className="win-btn-secondary" onClick={addMember} style={{ fontSize: 11 }}>추가</button>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>모임 일정</div>
              <input className="win-input" value={active.schedule} onChange={e => update(g => ({ ...g, schedule: e.target.value }))} placeholder="예: 매주 화요일 18:00" style={{ width: '100%' }} />
            </div>

            {/* Notes */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>공유 노트</div>
              <textarea className="win-input" value={active.notes} onChange={e => update(g => ({ ...g, notes: e.target.value }))} placeholder="공유 메모..." style={{ width: '100%', minHeight: 60, resize: 'none', fontSize: 12 }} />
            </div>

            {/* Tasks */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>할 일 배정</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="win-input" value={taskMember} onChange={e => setTaskMember(e.target.value)} style={{ width: 100 }}>
                  <option value="">담당자</option>
                  {active.members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input className="win-input" value={taskText} onChange={e => setTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="할 일" style={{ flex: 1 }} />
                <button className="win-btn-secondary" onClick={addTask} style={{ fontSize: 11 }}>추가</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {active.tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--win-surface-2)', borderRadius: 6, border: '1px solid var(--win-border)' }}>
                    <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: rgba(T.teal, 0.15), color: T.teal }}>{t.member}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--win-text)', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.text}</span>
                    <button onClick={() => removeTask(t.id)} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 12 }}>x</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
