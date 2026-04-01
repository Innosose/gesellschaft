import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Book {
  id: number
  title: string
  author: string
  startDate: string
  endDate: string
  rating: number
  memo: string
  totalPages: number
  currentPage: number
}

const STORAGE_KEY = 'gs-reading-log'
let nextId = 1

function load(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Book[]
    nextId = Math.max(...items.map(b => b.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: Book[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function Stars({ rating, onChange }: { rating: number; onChange?: (r: number) => void }): React.ReactElement {
  return (
    <span style={{ cursor: onChange ? 'pointer' : 'default', userSelect: 'none' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} onClick={() => onChange?.(i)} style={{ color: i <= rating ? T.warning : rgba(T.fg, 0.15), fontSize: 16 }}>★</span>
      ))}
    </span>
  )
}

export default function ReadingLogModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [books, setBooks] = useState<Book[]>(load)
  const [tab, setTab] = useState<'reading' | 'done' | 'add'>('reading')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [memo, setMemo] = useState('')

  useEffect(() => { save(books) }, [books])

  const reading = books.filter(b => !b.endDate)
  const done = books.filter(b => !!b.endDate)

  const addBook = (): void => {
    if (!title.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    setBooks(prev => [...prev, { id: nextId++, title: title.trim(), author: author.trim(), startDate: today, endDate: '', rating: 0, memo: memo.trim(), totalPages: parseInt(totalPages) || 0, currentPage: 0 }])
    setTitle(''); setAuthor(''); setTotalPages(''); setMemo(''); setTab('reading')
  }

  const updatePage = (id: number, page: number): void => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, currentPage: Math.max(0, Math.min(page, b.totalPages || 9999)) } : b))
  }

  const finishBook = (id: number): void => {
    const today = new Date().toISOString().slice(0, 10)
    setBooks(prev => prev.map(b => b.id === id ? { ...b, endDate: today, currentPage: b.totalPages } : b))
  }

  const setRating = (id: number, r: number): void => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, rating: r } : b))
  }

  const remove = (id: number): void => {
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <Modal title="독서 기록" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'reading' as const, label: `읽는 중 (${reading.length})` }, { id: 'done' as const, label: `완독 (${done.length})` }, { id: 'add' as const, label: '+ 추가' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="책 제목" style={{ width: '100%' }} />
            <input className="win-input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="저자" style={{ width: '100%' }} />
            <input className="win-input" value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="총 페이지 수 (선택)" type="number" style={{ width: '100%' }} />
            <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모" style={{ width: '100%' }} />
            <button className="win-btn-primary" onClick={addBook}>독서 시작</button>
          </div>
        )}

        {tab === 'reading' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reading.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>읽고 있는 책이 없습니다</div>}
            {reading.map(b => {
              const pct = b.totalPages > 0 ? Math.round((b.currentPage / b.totalPages) * 100) : 0
              return (
                <div key={b.id} style={{ padding: '12px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--win-text)' }}>{b.title}</span>
                      {b.author && <span style={{ fontSize: 12, color: 'var(--win-text-muted)', marginLeft: 8 }}>{b.author}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="win-btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => finishBook(b.id)}>완독</button>
                      <button className="win-btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => remove(b.id)}>삭제</button>
                    </div>
                  </div>
                  {b.totalPages > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: rgba(T.fg, 0.08), borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: T.gold, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <input className="win-input" type="number" value={b.currentPage} onChange={e => updatePage(b.id, parseInt(e.target.value) || 0)} style={{ width: 60, textAlign: 'center', fontSize: 11 }} />
                      <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>/ {b.totalPages}p ({pct}%)</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'done' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>완독한 책이 없습니다</div>}
            {done.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{b.author && `${b.author} · `}{b.startDate} ~ {b.endDate}{b.memo && ` · ${b.memo}`}</div>
                </div>
                <Stars rating={b.rating} onChange={r => setRating(b.id, r)} />
                <button className="win-btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => remove(b.id)}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
