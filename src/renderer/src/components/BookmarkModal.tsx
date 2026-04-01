import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'
import { useLocalStorage } from '../utils/hooks'
import { STORAGE_KEYS } from '../../../shared/constants'

interface Bookmark { id: number; title: string; url: string; category: string; createdAt: number }

let bid = 1

export default function BookmarkModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>(STORAGE_KEYS.bookmarks, [])
  if (bookmarks.length > 0 && bid <= Math.max(...bookmarks.map(b => b.id))) bid = Math.max(...bookmarks.map(b => b.id), 0) + 1
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [copied, setCopied] = useState<number | null>(null)

  const categories = useMemo(() => [...new Set(bookmarks.map(b => b.category).filter(Boolean))], [bookmarks])

  const filtered = useMemo(() => {
    let list = bookmarks
    if (filterCat !== 'all') list = list.filter(b => b.category === filterCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [bookmarks, filterCat, search])

  const addBookmark = useCallback(() => {
    if (!url.trim()) return
    const t = title.trim() || url.trim()
    setBookmarks(p => [...p, { id: bid++, title: t, url: url.trim(), category: category.trim(), createdAt: Date.now() }])
    setTitle(''); setUrl(''); setCategory('')
  }, [title, url, category])

  const removeBookmark = useCallback((id: number) => {
    setBookmarks(p => p.filter(b => b.id !== id))
  }, [])

  const copyUrl = useCallback((id: number, u: string) => {
    navigator.clipboard.writeText(u).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500) }).catch(() => {})
  }, [])

  return (
    <Modal title="북마크 관리" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* add form */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" style={{ flex: 1, minWidth: 100 }} />
          <input className="win-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" style={{ flex: 2, minWidth: 150 }} onKeyDown={e => e.key === 'Enter' && addBookmark()} />
          <input className="win-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="카테고리" style={{ width: 100 }} />
          <button className="win-btn-primary" onClick={addBookmark}>추가</button>
        </div>

        {/* filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ flex: 1 }} />
          <select className="win-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 120 }}>
            <option value="all">전체 카테고리</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>북마크가 없습니다</div>}
          {filtered.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                <div style={{ fontSize: 11, color: T.teal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.url}</div>
              </div>
              {b.category && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: T.teal, whiteSpace: 'nowrap' }}>{b.category}</span>}
              <button className="win-btn-ghost" onClick={() => copyUrl(b.id, b.url)} style={{ fontSize: 11, padding: '2px 8px' }}>
                {copied === b.id ? '복사됨!' : '복사'}
              </button>
              <button className="win-btn-danger" onClick={() => removeBookmark(b.id)} style={{ fontSize: 11, padding: '2px 8px' }}>삭제</button>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--win-text-muted)', textAlign: 'right' }}>총 {filtered.length}개</div>
      </div>
    </Modal>
  )
}
