import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Contact { id: number; name: string; phone: string; email: string; company: string; position: string; memo: string }

const STORAGE_KEY = 'gs-contacts'
let nextId = 1

function load(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Contact[]
    nextId = Math.max(...items.map(c => c.id), 0) + 1
    return items
  } catch { return [] }
}

type Tab = 'list' | 'add'

export default function ContactCardModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [contacts, setContacts] = useState<Contact[]>(load)
  const [tab, setTab] = useState<Tab>('list')
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [memo, setMemo] = useState('')
  const [viewing, setViewing] = useState<Contact | null>(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)) }, [contacts])

  const add = useCallback(() => {
    if (!name.trim()) return
    setContacts(prev => [{ id: nextId++, name: name.trim(), phone: phone.trim(), email: email.trim(), company: company.trim(), position: position.trim(), memo: memo.trim() }, ...prev])
    setName(''); setPhone(''); setEmail(''); setCompany(''); setPosition(''); setMemo('')
    setTab('list')
  }, [name, phone, email, company, position, memo])

  const remove = useCallback((id: number) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    if (viewing?.id === id) setViewing(null)
  }, [viewing])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const f = q ? contacts.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)) : contacts
    return f.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [contacts, search])

  const grouped = useMemo(() => {
    const map: Record<string, Contact[]> = {}
    filtered.forEach(c => {
      const key = c.company || '기타'
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'ko'))
  }, [filtered])

  return (
    <Modal title="명함 관리" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'list' as Tab, label: `목록 (${contacts.length})` }, { id: 'add' as Tab, label: '+ 추가' }]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setViewing(null) }} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: '이름 *', v: name, s: setName, p: '이름' },
              { l: '전화번호', v: phone, s: setPhone, p: '010-0000-0000' },
              { l: '이메일', v: email, s: setEmail, p: 'email@example.com' },
              { l: '회사/소속', v: company, s: setCompany, p: '회사명' },
              { l: '직위/직책', v: position, s: setPosition, p: '직위' },
            ].map(f => (
              <div key={f.l}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>{f.l}</label>
                <input className="win-input" value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.p} style={{ width: '100%' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>메모</label>
              <textarea className="win-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모..." style={{ width: '100%', minHeight: 60, resize: 'none' }} />
            </div>
            <button className="win-btn-primary" onClick={add} style={{ alignSelf: 'flex-start', fontSize: 12 }}>저장</button>
          </div>
        )}

        {tab === 'list' && !viewing && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ flex: 1 }} />
              <button className={groupBy ? 'win-btn-primary' : 'win-btn-ghost'} onClick={() => setGroupBy(!groupBy)} style={{ fontSize: 11 }}>그룹</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>연락처가 없습니다</div>}
              {groupBy ? grouped.map(([g, items]) => (
                <div key={g}>
                  <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, padding: '6px 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{g}</div>
                  {items.map(c => (
                    <div key={c.id} onClick={() => setViewing(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer', marginBottom: 3 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(123,143,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.teal }}>{c.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{c.position}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )) : filtered.map(c => (
                <div key={c.id} onClick={() => setViewing(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(123,143,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.teal }}>{c.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{[c.company, c.position].filter(Boolean).join(' / ')}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{c.phone}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'list' && viewing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="win-btn-ghost" onClick={() => setViewing(null)} style={{ alignSelf: 'flex-start', fontSize: 12 }}>← 목록</button>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(123,143,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: T.teal, margin: '0 auto 10px' }}>{viewing.name[0]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-text)' }}>{viewing.name}</div>
              {viewing.position && <div style={{ fontSize: 12, color: 'var(--win-text-sub)' }}>{viewing.position}</div>}
              {viewing.company && <div style={{ fontSize: 12, color: T.teal }}>{viewing.company}</div>}
            </div>
            {[{ l: '전화', v: viewing.phone }, { l: '이메일', v: viewing.email }, { l: '메모', v: viewing.memo }].filter(f => f.v).map(f => (
              <div key={f.l} style={{ padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 2 }}>{f.l}</div>
                <div style={{ fontSize: 13, color: 'var(--win-text)' }}>{f.v}</div>
              </div>
            ))}
            <button className="win-btn-danger" onClick={() => { remove(viewing.id); setViewing(null) }} style={{ alignSelf: 'flex-start', fontSize: 12 }}>삭제</button>
          </div>
        )}
      </div>
    </Modal>
  )
}
