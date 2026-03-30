import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './SearchModal'

interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  // Append T00:00:00 so the string is parsed as local time, not UTC
  return new Date(dueDate + 'T00:00:00') < new Date(new Date().toDateString())
}

function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  return dueDate === localDateStr()
}

export default function TodoModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal'>('normal')
  const [dueDate, setDueDate] = useState('')
  const [manualOrder, setManualOrder] = useState<string[]>([])
  const dragId = useRef<string | null>(null)
  const dragOverId = useRef<string | null>(null)

  useEffect(() => {
    window.api.todo.get().then(t => { setTodos(t); setManualOrder(t.filter(x => !x.done).map(x => x.id)) }).catch(() => {})
  }, [])

  const add = async (): Promise<void> => {
    if (!text.trim()) return
    const updated = await window.api.todo.add({ text: text.trim(), done: false, priority, dueDate: dueDate || undefined })
    const pendingIds = updated.filter(x => !x.done).map(x => x.id)
    setTodos(updated)
    setManualOrder(prev => [...prev, ...pendingIds.filter(id => !prev.includes(id))])
    setText('')
    setDueDate('')
    setPriority('normal')
  }

  const toggle = async (id: string): Promise<void> => {
    const updated = await window.api.todo.toggle(id)
    setTodos(updated)
    const pendingIds = updated.filter(t => !t.done).map(t => t.id)
    setManualOrder(prev => [
      ...prev.filter(x => pendingIds.includes(x)),            // keep existing order for still-pending items
      ...pendingIds.filter(pid => !prev.includes(pid))         // append newly re-opened items at end
    ])
  }

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm('항목을 삭제하시겠습니까?')) return
    const updated = await window.api.todo.delete(id)
    setTodos(updated)
    setManualOrder(prev => prev.filter(x => x !== id))
  }

  const clearDone = async (): Promise<void> => {
    const updated = await window.api.todo.clearDone()
    setTodos(updated)
  }

  const handleDragStart = (id: string): void => { dragId.current = id }
  const handleDragOver = (e: React.DragEvent, id: string): void => {
    e.preventDefault()
    dragOverId.current = id
  }
  const handleDrop = (): void => {
    // Capture ref values into locals BEFORE clearing refs.
    // State updaters run lazily at render time; if we read refs inside the updater,
    // they would already be null by then and indexOf(null) would return -1.
    const fromId = dragId.current
    const toId = dragOverId.current
    dragId.current = null
    dragOverId.current = null
    if (!fromId || !toId || fromId === toId) return
    setManualOrder(prev => {
      const arr = [...prev]
      const from = arr.indexOf(fromId)
      const to = arr.indexOf(toId)
      if (from === -1 || to === -1) return prev
      arr.splice(from, 1)
      arr.splice(to, 0, fromId)
      return arr
    })
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)
  const overdueCount = pending.filter(t => isOverdue(t.dueDate)).length
  const todayCount = pending.filter(t => isDueToday(t.dueDate)).length
  const highCount = pending.filter(t => t.priority === 'high').length
  const total = todos.length
  const doneRate = total > 0 ? Math.round((done.length / total) * 100) : 0

  const sorted = manualOrder.length > 0
    ? [...pending].sort((a, b) => {
        const ai = manualOrder.indexOf(a.id)
        const bi = manualOrder.indexOf(b.id)
        if (ai === -1 && bi === -1) return b.createdAt - a.createdAt
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : [...pending].sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1
        if (a.priority !== 'high' && b.priority === 'high') return 1
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        return b.createdAt - a.createdAt
      })

  return (
    <Modal title="할일 목록" onClose={onClose} asPanel={asPanel}>
      <div className="space-y-3">

        {/* 완료율 통계 */}
        {total > 0 && (
          <div className="rounded-lg p-3" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-3 text-xs">
                <span style={{ color: 'var(--win-text-muted)' }}>전체 <b style={{ color: 'var(--win-text)' }}>{total}</b></span>
                <span style={{ color: 'var(--win-text-muted)' }}>남은 <b style={{ color: 'var(--win-text)' }}>{pending.length}</b></span>
                <span style={{ color: 'var(--win-text-muted)' }}>완료 <b style={{ color: '#4caf50' }}>{done.length}</b></span>
                {overdueCount > 0 && <span style={{ color: '#c42b1c' }}>⚠️ 초과 {overdueCount}</span>}
                {todayCount > 0 && <span style={{ color: '#f97316' }}>📅 오늘 {todayCount}</span>}
                {highCount > 0 && <span style={{ color: '#ff6b6b' }}>🔴 중요 {highCount}</span>}
              </div>
              <span className="text-xs font-bold" style={{ color: doneRate === 100 ? '#4caf50' : 'var(--win-text-muted)' }}>{doneRate}%</span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--win-surface)' }}>
              <div style={{
                height: '100%', width: `${doneRate}%`,
                background: doneRate === 100 ? '#4caf50' : 'linear-gradient(90deg, #0078d4, #40a0ff)',
                transition: 'width 0.4s ease',
                borderRadius: 999,
              }} />
            </div>
          </div>
        )}
        {/* 입력 */}
        <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)' }}>
          <div className="flex gap-2">
            <input
              className="win-input flex-1 text-sm"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="새 할일을 입력하세요..."
              autoFocus
            />
            <button
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={priority === 'high'
                ? { background: '#c42b1c20', borderColor: '#c42b1c60', color: '#ff6b6b' }
                : { borderColor: 'var(--win-border)', color: 'var(--win-text-muted)' }
              }
              onMouseEnter={(e) => { if (priority !== 'high') (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)' }}
              onMouseLeave={(e) => { if (priority !== 'high') (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
              onClick={() => setPriority(p => p === 'high' ? 'normal' : 'high')}
              title="중요도 토글"
            >
              {priority === 'high' ? '🔴 중요' : '⚪ 보통'}
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="win-input text-xs w-36"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <span className="text-xs" style={{ color: 'var(--win-text-muted)' }}>마감일 (선택)</span>
            <div className="flex-1" />
            <button
              className="win-btn-primary text-xs"
              onClick={add}
              disabled={!text.trim()}
            >
              추가
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 items-center">
          <button
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === 'todo' ? 'bg-[#0078d4] text-white' : ''}`}
            style={tab !== 'todo' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab('todo')}
          >
            할일 {pending.length > 0 && `(${pending.length})`}
          </button>
          <button
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === 'done' ? 'bg-[#0078d4] text-white' : ''}`}
            style={tab !== 'done' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab('done')}
          >
            완료 {done.length > 0 && `(${done.length})`}
          </button>
          {done.length > 0 && tab === 'done' && (
            <button
              className="ml-auto text-xs"
              style={{ color: 'var(--win-text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
              onClick={clearDone}
            >
              완료 항목 삭제
            </button>
          )}
        </div>

        {/* 목록 */}
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
          {tab === 'todo' && sorted.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
              <div className="text-4xl mb-2">✅</div>
              <div className="text-sm">할일이 없습니다.</div>
            </div>
          )}

          {tab === 'todo' && sorted.map(item => {
            const overdue = isOverdue(item.dueDate)
            const today = isDueToday(item.dueDate)
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg group transition-colors"
                style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', cursor: 'default' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-border)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-surface)' }}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={handleDrop}
              >
                <span className="text-[10px] cursor-grab opacity-30 group-hover:opacity-70 flex-shrink-0 select-none" title="드래그하여 순서 변경">⠿</span>
                <button
                  className="rounded flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    width: 18,
                    height: 18,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: item.priority === 'high' ? '#c42b1c80' : 'var(--win-text-muted)'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--win-accent)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = item.priority === 'high' ? '#c42b1c80' : 'var(--win-text-muted)' }}
                  onClick={() => toggle(item.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ color: item.priority === 'high' ? 'var(--win-text)' : 'var(--win-text-sub)' }}>
                    {item.priority === 'high' && <span className="mr-1" style={{ color: '#ff6b6b' }}>●</span>}
                    {item.text}
                  </div>
                  {item.dueDate && (
                    <div className={`text-[10px] mt-0.5 ${overdue ? 'text-[#c42b1c]' : today ? 'text-[#f97316]' : ''}`} style={!overdue && !today ? { color: 'var(--win-text-muted)' } : undefined}>
                      {overdue ? '⚠️ 마감 지남 — ' : today ? '📅 오늘 마감 — ' : '📅 '}{item.dueDate}
                    </div>
                  )}
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  style={{ color: 'var(--win-text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                  onClick={() => remove(item.id)}
                >✕</button>
              </div>
            )
          })}

          {tab === 'done' && done.length === 0 && (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--win-text-muted)' }}>완료된 항목이 없습니다.</div>
          )}

          {tab === 'done' && done.map(item => (
            <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg group" style={{ border: '1px solid var(--win-bg)' }}>
              <span className="text-xs" style={{ color: 'var(--win-text-muted)' }}>✓</span>
              <span className="flex-1 text-xs line-through truncate" style={{ color: 'var(--win-text-muted)' }}>{item.text}</span>
              {item.dueDate && <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>{item.dueDate}</span>}
              <button
                className="opacity-0 group-hover:opacity-100 text-xs"
                style={{ color: 'var(--win-text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                onClick={() => remove(item.id)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
