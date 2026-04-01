import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

interface DiaryEntry {
  id: number
  date: string
  mood: string
  weather: string
  content: string
  tags: string[]
}

const STORAGE_KEY = 'gs-diary'
const MOODS = [
  { emoji: '\u{1F60A}', label: '행복' },
  { emoji: '\u{1F642}', label: '보통' },
  { emoji: '\u{1F614}', label: '우울' },
  { emoji: '\u{1F620}', label: '화남' },
  { emoji: '\u{1F622}', label: '슬픔' },
]
const WEATHERS = [
  { emoji: '\u2600\uFE0F', label: '맑음' },
  { emoji: '\u26C5', label: '흐림' },
  { emoji: '\u{1F327}\uFE0F', label: '비' },
  { emoji: '\u2744\uFE0F', label: '눈' },
  { emoji: '\u{1F32C}\uFE0F', label: '바람' },
]
let nextId = 1

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as DiaryEntry[]
    nextId = Math.max(...items.map(e => e.id), 0) + 1
    return items
  } catch { return [] }
}

function save(items: DiaryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function DiaryModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [entries, setEntries] = useState<DiaryEntry[]>(load)
  const [date, setDate] = useState(todayStr())
  const [mood, setMood] = useState(MOODS[0].emoji)
  const [weather, setWeather] = useState(WEATHERS[0].emoji)
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const filtered = useMemo(() => {
    let list = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.content.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)) || e.date.includes(q))
    }
    return list
  }, [entries, search])

  const addTag = (): void => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return
    setTags(prev => [...prev, tagInput.trim()])
    setTagInput('')
  }

  const saveEntry = (): void => {
    if (!content.trim()) return
    if (editId !== null) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, date, mood, weather, content: content.trim(), tags: [...tags] } : e))
      setEditId(null)
    } else {
      setEntries(prev => [...prev, { id: nextId++, date, mood, weather, content: content.trim(), tags: [...tags] }])
    }
    setContent(''); setTags([]); setDate(todayStr()); setMood(MOODS[0].emoji); setWeather(WEATHERS[0].emoji)
  }

  const startEdit = (e: DiaryEntry): void => {
    setEditId(e.id); setDate(e.date); setMood(e.mood); setWeather(e.weather); setContent(e.content); setTags([...e.tags])
  }

  const remove = (id: number): void => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (editId === id) { setEditId(null); setContent('') }
  }

  return (
    <Modal title="일기장" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 140 }} />
            <div style={{ display: 'flex', gap: 2 }}>
              {MOODS.map(m => (
                <span key={m.emoji} onClick={() => setMood(m.emoji)} title={m.label} style={{
                  fontSize: 18, cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                  background: mood === m.emoji ? 'rgba(99,102,241,0.3)' : 'transparent',
                }}>{m.emoji}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {WEATHERS.map(w => (
                <span key={w.emoji} onClick={() => setWeather(w.emoji)} title={w.label} style={{
                  fontSize: 16, cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                  background: weather === w.emoji ? 'rgba(99,102,241,0.3)' : 'transparent',
                }}>{w.emoji}</span>
              ))}
            </div>
          </div>
          <textarea className="win-input" value={content} onChange={e => setContent(e.target.value)} placeholder="오늘 하루는 어땠나요?" rows={4} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="win-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="태그 (Enter)" style={{ width: 100, fontSize: 11 }} />
            {tags.map(t => (
              <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.2)', color: T.teal, cursor: 'pointer' }} onClick={() => setTags(prev => prev.filter(x => x !== t))}>#{t} ×</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="win-btn-primary" onClick={saveEntry} style={{ fontSize: 12 }}>{editId !== null ? '수정' : '저장'}</button>
            {editId !== null && <button className="win-btn-ghost" onClick={() => { setEditId(null); setContent(''); setTags([]) }} style={{ fontSize: 12 }}>취소</button>}
          </div>
        </div>

        {/* 검색 */}
        <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="일기 검색..." style={{ width: '100%' }} />

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>일기가 없습니다</div>}
          {filtered.map(e => (
            <div key={e.id} onClick={() => startEdit(e)} style={{ padding: '10px 14px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{e.date}</span>
                  <span style={{ fontSize: 14 }}>{e.mood}</span>
                  <span style={{ fontSize: 14 }}>{e.weather}</span>
                </div>
                <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={ev => { ev.stopPropagation(); remove(e.id) }}>×</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--win-text-sub)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{e.content}</div>
              {e.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.tags.map(t => <span key={t} style={{ fontSize: 10, color: T.teal }}>#{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
