import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Shortcut { id: number; keys: string; action: string; category: string }

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 1, keys: 'Ctrl+Shift+G', action: 'Gesellschaft 열기/닫기', category: '앱' },
  { id: 2, keys: 'Escape', action: '현재 화면 닫기', category: '앱' },
  { id: 3, keys: 'Ctrl+C', action: '복사', category: '기본' },
  { id: 4, keys: 'Ctrl+V', action: '붙여넣기', category: '기본' },
  { id: 5, keys: 'Ctrl+Z', action: '실행 취소', category: '기본' },
  { id: 6, keys: 'Ctrl+Shift+Z', action: '다시 실행', category: '기본' },
  { id: 7, keys: 'Ctrl+A', action: '전체 선택', category: '기본' },
  { id: 8, keys: 'Ctrl+S', action: '저장', category: '기본' },
  { id: 9, keys: 'Alt+Tab', action: '창 전환', category: '시스템' },
  { id: 10, keys: 'Ctrl+Shift+Esc', action: '작업 관리자', category: '시스템' },
  { id: 11, keys: 'Win+D', action: '바탕화면 보기', category: '시스템' },
  { id: 12, keys: 'Win+L', action: '화면 잠금', category: '시스템' },
]

const SK = 'gs-custom-shortcuts'
let sid = 100

function loadCustom(): Shortcut[] {
  try { return JSON.parse(localStorage.getItem(SK) ?? '[]') } catch { return [] }
}
function saveCustom(items: Shortcut[]): void { localStorage.setItem(SK, JSON.stringify(items)) }

export default function KeyboardModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [custom, setCustom] = useState<Shortcut[]>(loadCustom)
  const [filter, setFilter] = useState('')
  const [newKeys, setNewKeys] = useState('')
  const [newAction, setNewAction] = useState('')
  const [newCat, setNewCat] = useState('사용자')

  const all = [...DEFAULT_SHORTCUTS, ...custom]
  const filtered = filter
    ? all.filter(s => s.keys.toLowerCase().includes(filter.toLowerCase()) || s.action.includes(filter) || s.category.includes(filter))
    : all

  const categories = [...new Set(filtered.map(s => s.category))]

  const addShortcut = useCallback(() => {
    if (!newKeys.trim() || !newAction.trim()) return
    const item: Shortcut = { id: ++sid, keys: newKeys.trim(), action: newAction.trim(), category: newCat }
    const next = [...custom, item]
    setCustom(next); saveCustom(next)
    setNewKeys(''); setNewAction('')
  }, [newKeys, newAction, newCat, custom])

  const removeShortcut = useCallback((id: number) => {
    const next = custom.filter(s => s.id !== id)
    setCustom(next); saveCustom(next)
  }, [custom])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Keyboard" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="단축키 또는 동작 검색..."
          style={{ ...inputStyle, width: '100%' }} />

        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.6), textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.filter(s => s.category === cat).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}` }}>
                  <code style={{ fontSize: 11, color: T.teal, background: rgba(T.teal, 0.08), padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.keys}</code>
                  <span style={{ flex: 1, fontSize: 12, color: rgba(T.fg, 0.75) }}>{s.action}</span>
                  {s.id >= 100 && (
                    <button onClick={() => removeShortcut(s.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.6), cursor: 'pointer', fontSize: 11 }}>x</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.08)}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), marginBottom: 8 }}>커스텀 단축키 추가</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={newKeys} onChange={e => setNewKeys(e.target.value)} placeholder="키 조합 (예: Ctrl+K)" style={{ ...inputStyle, width: 140 }} />
            <input value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="동작 설명" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리" style={{ ...inputStyle, width: 80 }} />
            <button onClick={addShortcut} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
