import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'

interface TodoItem {
  id: string
  text: string
  done: boolean
  priority: 'high' | 'normal'
  dueDate?: string
  createdAt: number
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  return dueDate === new Date().toISOString().slice(0, 10)
}

export default function TodoModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'high' | 'normal'>('normal')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    window.api.todo.get().then(setTodos)
  }, [])

  const add = async (): Promise<void> => {
    if (!text.trim()) return
    const updated = await window.api.todo.add({
      text: text.trim(),
      done: false,
      priority,
      dueDate: dueDate || undefined
    })
    setTodos(updated)
    setText('')
    setDueDate('')
    setPriority('normal')
  }

  const toggle = async (id: string): Promise<void> => {
    const updated = await window.api.todo.toggle(id)
    setTodos(updated)
  }

  const remove = async (id: string): Promise<void> => {
    const updated = await window.api.todo.delete(id)
    setTodos(updated)
  }

  const clearDone = async (): Promise<void> => {
    const updated = await window.api.todo.clearDone()
    setTodos(updated)
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  const sorted = [...pending].sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1
    if (a.priority !== 'high' && b.priority === 'high') return 1
    return 0
  })

  return (
    <Modal title="할일 목록" onClose={onClose} asPanel={asPanel}>
      <div className="space-y-3">
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
                style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-border)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-surface)' }}
              >
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
              <span className="text-xs" style={{ color: 'var(--win-border)' }}>✓</span>
              <span className="flex-1 text-xs line-through truncate" style={{ color: 'var(--win-text-muted)' }}>{item.text}</span>
              {item.dueDate && <span className="text-[10px]" style={{ color: 'var(--win-border)' }}>{item.dueDate}</span>}
              <button
                className="opacity-0 group-hover:opacity-100 text-xs"
                style={{ color: 'var(--win-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-border)' }}
                onClick={() => remove(item.id)}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
