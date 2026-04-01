import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type ColumnId = 'todo' | 'doing' | 'done'

interface KanbanCard {
  id: number
  title: string
  description: string
  color: string
  column: ColumnId
  createdAt: string
}

const STORAGE_KEY = 'gs-kanban'
const COLUMNS: { id: ColumnId; label: string; accent: string }[] = [
  { id: 'todo', label: '할 일', accent: T.danger },
  { id: 'doing', label: '진행 중', accent: T.warning },
  { id: 'done', label: '완료', accent: T.success },
]
const CARD_COLORS = [T.gold, T.danger, T.success, T.warning, rgba(T.danger, 0.7), T.teal, rgba(T.warning, 0.8), rgba(T.fg, 0.5)]
let nextId = 1

function load(): KanbanCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as KanbanCard[]
    nextId = Math.max(...items.map(c => c.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: KanbanCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function KanbanModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [cards, setCards] = useState<KanbanCard[]>(load)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => { save(cards) }, [cards])

  const addCard = (): void => {
    if (!title.trim()) return
    if (editId !== null) {
      setCards(prev => prev.map(c => c.id === editId ? { ...c, title: title.trim(), description: description.trim(), color } : c))
      setEditId(null)
    } else {
      setCards(prev => [...prev, { id: nextId++, title: title.trim(), description: description.trim(), color, column: 'todo', createdAt: new Date().toISOString().slice(0, 10) }])
    }
    setTitle(''); setDescription(''); setColor(CARD_COLORS[0])
  }

  const moveCard = (id: number, direction: 'left' | 'right'): void => {
    const order: ColumnId[] = ['todo', 'doing', 'done']
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c
      const idx = order.indexOf(c.column)
      const newIdx = direction === 'right' ? Math.min(idx + 1, 2) : Math.max(idx - 1, 0)
      return { ...c, column: order[newIdx] }
    }))
  }

  const startEdit = (c: KanbanCard): void => {
    setEditId(c.id); setTitle(c.title); setDescription(c.description); setColor(c.color)
  }

  const remove = (id: number): void => {
    setCards(prev => prev.filter(c => c.id !== id))
    if (editId === id) { setEditId(null); setTitle(''); setDescription('') }
  }

  return (
    <Modal title="칸반 보드" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCard()} placeholder="카드 제목" style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {CARD_COLORS.map(c => (
                <span key={c} onClick={() => setColor(c)} style={{ width: 14, height: 14, borderRadius: 3, background: c, cursor: 'pointer', border: color === c ? '2px solid #fff' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="설명 (선택)" style={{ flex: 1 }} />
            <button className="win-btn-primary" onClick={addCard} style={{ fontSize: 12 }}>{editId !== null ? '수정' : '추가'}</button>
            {editId !== null && <button className="win-btn-ghost" onClick={() => { setEditId(null); setTitle(''); setDescription('') }} style={{ fontSize: 12 }}>취소</button>}
          </div>
        </div>

        {/* 칸반 보드 */}
        <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', minHeight: 0 }}>
          {COLUMNS.map(col => {
            const colCards = cards.filter(c => c.column === col.id)
            return (
              <div key={col.id} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: rgba(T.fg, 0.03), borderRadius: 8, border: '1px solid var(--win-border)', overflow: 'hidden' }}>
                {/* Column header */}
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${col.accent}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.accent }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--win-text-muted)', background: rgba(T.fg, 0.06), padding: '1px 6px', borderRadius: 10 }}>{colCards.length}</span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {colCards.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 11, padding: 20 }}>비어있음</div>
                  )}
                  {colCards.map(c => (
                    <div key={c.id} style={{ padding: '8px 10px', background: 'var(--win-surface-2)', borderRadius: 6, borderLeft: `3px solid ${c.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text)', wordBreak: 'break-word' }}>{c.title}</span>
                        <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}>×</button>
                      </div>
                      {c.description && <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6, wordBreak: 'break-word' }}>{c.description}</div>}
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {col.id !== 'todo' && (
                            <button className="win-btn-ghost" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => moveCard(c.id, 'left')}>&larr;</button>
                          )}
                          {col.id !== 'done' && (
                            <button className="win-btn-ghost" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => moveCard(c.id, 'right')}>&rarr;</button>
                          )}
                        </div>
                        <button className="win-btn-ghost" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => startEdit(c)}>편집</button>
                      </div>
                    </div>
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
