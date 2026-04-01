import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface LaunchItem { id: number; name: string; path: string; type: 'app' | 'folder' | 'url'; pinned: boolean }

const SK = 'gs-launcher-items'
let lid = 1

function load(): LaunchItem[] {
  try { return JSON.parse(localStorage.getItem(SK) ?? '[]') } catch { return [] }
}
function save(items: LaunchItem[]): void { localStorage.setItem(SK, JSON.stringify(items)) }

export default function LauncherModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [items, setItems] = useState<LaunchItem[]>(() => { const l = load(); lid = Math.max(1, ...l.map(i => i.id)) + 1; return l })
  const [filter, setFilter] = useState('')
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [newType, setNewType] = useState<LaunchItem['type']>('url')

  const filtered = filter
    ? items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.path.toLowerCase().includes(filter.toLowerCase()))
    : items

  const pinned = filtered.filter(i => i.pinned)
  const others = filtered.filter(i => !i.pinned)

  const addItem = useCallback(() => {
    if (!newName.trim() || !newPath.trim()) return
    const item: LaunchItem = { id: lid++, name: newName.trim(), path: newPath.trim(), type: newType, pinned: false }
    const next = [...items, item]; setItems(next); save(next)
    setNewName(''); setNewPath('')
  }, [newName, newPath, newType, items])

  const removeItem = useCallback((id: number) => {
    const next = items.filter(i => i.id !== id); setItems(next); save(next)
  }, [items])

  const togglePin = useCallback((id: number) => {
    const next = items.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i); setItems(next); save(next)
  }, [items])

  const launch = useCallback((item: LaunchItem) => {
    if (item.type === 'url') {
      window.open(item.path, '_blank')
    } else if (window.api?.shell) {
      window.api.shell.openPath(item.path)
    }
  }, [])

  const typeIcon = (t: LaunchItem['type']) => t === 'url' ? '~' : t === 'app' ? '>' : '/'

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  const renderItem = (item: LaunchItem) => (
    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}`, cursor: 'pointer' }} onClick={() => launch(item)}>
      <span style={{ width: 20, height: 20, borderRadius: 3, background: rgba(T.teal, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.teal, fontFamily: 'monospace', flexShrink: 0 }}>{typeIcon(item.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: rgba(T.fg, 0.85), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 10, color: rgba(T.fg, 0.35), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.path}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); togglePin(item.id) }} style={{ background: 'none', border: 'none', color: item.pinned ? T.gold : rgba(T.gold, 0.25), cursor: 'pointer', fontSize: 14 }} title={item.pinned ? '고정 해제' : '고정'}>*</button>
      <button onClick={e => { e.stopPropagation(); removeItem(item.id) }} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.5), cursor: 'pointer', fontSize: 11 }}>x</button>
    </div>
  )

  return (
    <Modal title="Launcher" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="검색..." style={{ ...inputStyle, width: '100%' }} />

        {pinned.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), letterSpacing: '0.1em', marginBottom: 6 }}>PINNED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{pinned.map(renderItem)}</div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), letterSpacing: '0.1em', marginBottom: 6 }}>ALL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{others.map(renderItem)}</div>
          </div>
        )}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', color: rgba(T.fg, 0.3), fontSize: 12, padding: 40 }}>
            자주 쓰는 앱, 폴더, URL을 추가해보세요
          </div>
        )}

        <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.08)}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), marginBottom: 8 }}>새 항목 추가</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={newType} onChange={e => setNewType(e.target.value as LaunchItem['type'])} style={{ ...inputStyle, width: 70 }}>
              <option value="url">URL</option>
              <option value="app">앱</option>
              <option value="folder">폴더</option>
            </select>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름" style={{ ...inputStyle, width: 120 }} />
            <input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="경로 또는 URL" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <button onClick={addItem} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
