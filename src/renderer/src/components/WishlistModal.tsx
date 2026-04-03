import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

interface WishItem { id: number; name: string; price: number; priority: 'high' | 'medium' | 'low'; link: string; imageUrl: string; purchased: boolean }

const STORAGE_KEY = 'gs-wishlist'
let nextId = 1

function load(): WishItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as WishItem[]
    nextId = Math.max(...items.map(w => w.id), 0) + 1
    return items
  } catch { return [] }
}

const PRIORITY_LABELS = { high: '높음', medium: '보통', low: '낮음' }
const PRIORITY_COLORS = { high: T.danger, medium: T.warning, low: T.success }
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function WishlistModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [items, setItems] = useState<WishItem[]>(load)
  const [adding, setAdding] = useState(false)
  const [sortBy, setSortBy] = useState<'priority' | 'price'>('priority')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [link, setLink] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }, [items])

  const add = useCallback(() => {
    if (!name.trim()) return
    setItems(prev => [...prev, { id: nextId++, name: name.trim(), price: parseFloat(price) || 0, priority, link: link.trim(), imageUrl: imageUrl.trim(), purchased: false }])
    setName(''); setPrice(''); setLink(''); setImageUrl(''); setPriority('medium'); setAdding(false)
  }, [name, price, priority, link, imageUrl])

  const toggle = useCallback((id: number) => {
    setItems(prev => prev.map(w => w.id === id ? { ...w, purchased: !w.purchased } : w))
  }, [])

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(w => w.id !== id))
  }, [])

  const sorted = useMemo(() => {
    const s = [...items]
    if (sortBy === 'priority') s.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    else s.sort((a, b) => b.price - a.price)
    return s
  }, [items, sortBy])

  const totalPrice = useMemo(() => items.filter(w => !w.purchased).reduce((s, w) => s + w.price, 0), [items])
  const purchasedTotal = useMemo(() => items.filter(w => w.purchased).reduce((s, w) => s + w.price, 0), [items])
  const fmt = (n: number) => n.toLocaleString('ko-KR')

  return (
    <Modal title="위시리스트" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* Summary */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 8, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>남은 총액</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.teal }}>{fmt(totalPrice)}원</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 8, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>구매 완료</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.success }}>{fmt(purchasedTotal)}원</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="win-btn-primary" onClick={() => setAdding(!adding)} style={{ fontSize: 12 }}>{adding ? '취소' : '+ 추가'}</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>정렬:</span>
          <button className={sortBy === 'priority' ? 'win-btn-secondary' : 'win-btn-ghost'} onClick={() => setSortBy('priority')} style={{ fontSize: 11, padding: '3px 10px' }}>우선순위</button>
          <button className={sortBy === 'price' ? 'win-btn-secondary' : 'win-btn-ghost'} onClick={() => setSortBy('price')} style={{ fontSize: 11, padding: '3px 10px' }}>가격</button>
        </div>

        {/* Add form */}
        {adding && (
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="win-input" value={name} onChange={e => setName(e.target.value)} placeholder="상품명 *" style={{ flex: 2 }} />
              <input className="win-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="가격 (원)" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="win-input" value={priority} onChange={e => setPriority(e.target.value as 'high' | 'medium' | 'low')} style={{ width: 100 }}>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
              <input className="win-input" value={link} onChange={e => setLink(e.target.value)} placeholder="링크 (선택)" style={{ flex: 1 }} />
              <input className="win-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="이미지 URL (선택)" style={{ flex: 1 }} />
            </div>
            <button className="win-btn-primary" onClick={add} style={{ alignSelf: 'flex-start', fontSize: 12 }}>추가</button>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>위시리스트가 비어있습니다</div>}
          {sorted.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', opacity: w.purchased ? 0.5 : 1 }}>
              <input type="checkbox" checked={w.purchased} onChange={() => toggle(w.id)} />
              {w.imageUrl && <img src={w.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)', textDecoration: w.purchased ? 'line-through' : 'none' }}>{w.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_COLORS[w.priority] }}>{PRIORITY_LABELS[w.priority]}</span>
                  {w.link && <a href={w.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.teal }}>링크</a>}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)' }}>{fmt(w.price)}원</div>
              <button onClick={() => remove(w.id)} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 14 }}>x</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
