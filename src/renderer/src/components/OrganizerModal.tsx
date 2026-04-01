import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Tab = 'todo' | 'template'

interface TodoItem { id: number; text: string; done: boolean; priority: 'high' | 'mid' | 'low'; due?: string; createdAt: number }
interface Template { id: number; name: string; content: string; category: string }

const TODO_SK = 'gs-organizer-todos'
const TMPL_SK = 'gs-organizer-templates'
let tid = 1, tmid = 1

function loadTodos(): TodoItem[] { try { return JSON.parse(localStorage.getItem(TODO_SK) ?? '[]') } catch { return [] } }
function saveTodos(items: TodoItem[]): void { localStorage.setItem(TODO_SK, JSON.stringify(items)) }
function loadTemplates(): Template[] { try { return JSON.parse(localStorage.getItem(TMPL_SK) ?? '[]') } catch { return [] } }
function saveTemplates(items: Template[]): void { localStorage.setItem(TMPL_SK, JSON.stringify(items)) }

const PRIORITY_COLORS = { high: T.danger, mid: T.warning, low: T.teal }

export default function OrganizerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<Tab>('todo')
  const [todos, setTodos] = useState<TodoItem[]>(() => { const l = loadTodos(); tid = Math.max(1, ...l.map(i => i.id)) + 1; return l })
  const [templates, setTemplates] = useState<Template[]>(() => { const l = loadTemplates(); tmid = Math.max(1, ...l.map(i => i.id)) + 1; return l })
  const [newTodo, setNewTodo] = useState('')
  const [newPriority, setNewPriority] = useState<TodoItem['priority']>('mid')
  const [newDue, setNewDue] = useState('')
  const [newTmplName, setNewTmplName] = useState('')
  const [newTmplContent, setNewTmplContent] = useState('')
  const [newTmplCat, setNewTmplCat] = useState('일반')
  const [copied, setCopied] = useState<number | null>(null)

  const sortedTodos = useMemo(() => {
    const pOrder = { high: 0, mid: 1, low: 2 }
    return [...todos].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || pOrder[a.priority] - pOrder[b.priority])
  }, [todos])

  const addTodo = useCallback(() => {
    if (!newTodo.trim()) return
    const item: TodoItem = { id: tid++, text: newTodo.trim(), done: false, priority: newPriority, due: newDue || undefined, createdAt: Date.now() }
    const next = [...todos, item]; setTodos(next); saveTodos(next); setNewTodo(''); setNewDue('')
  }, [newTodo, newPriority, newDue, todos])

  const toggleTodo = useCallback((id: number) => {
    const next = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(next); saveTodos(next)
  }, [todos])

  const removeTodo = useCallback((id: number) => {
    const next = todos.filter(t => t.id !== id); setTodos(next); saveTodos(next)
  }, [todos])

  const addTemplate = useCallback(() => {
    if (!newTmplName.trim() || !newTmplContent.trim()) return
    const item: Template = { id: tmid++, name: newTmplName.trim(), content: newTmplContent.trim(), category: newTmplCat }
    const next = [...templates, item]; setTemplates(next); saveTemplates(next)
    setNewTmplName(''); setNewTmplContent('')
  }, [newTmplName, newTmplContent, newTmplCat, templates])

  const removeTemplate = useCallback((id: number) => {
    const next = templates.filter(t => t.id !== id); setTemplates(next); saveTemplates(next)
  }, [templates])

  const copyTemplate = useCallback((id: number, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {}); setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 4, border: `1px solid ${active ? rgba(T.teal, 0.3) : rgba(T.gold, 0.1)}`,
    background: active ? rgba(T.teal, 0.08) : 'transparent',
    color: active ? T.teal : rgba(T.fg, 0.5), fontSize: 11, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <Modal title="Organizer" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('todo')} style={tabStyle(tab === 'todo')}>To-Do</button>
          <button onClick={() => setTab('template')} style={tabStyle(tab === 'template')}>Templates</button>
        </div>

        {tab === 'todo' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="할일 추가..." style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as TodoItem['priority'])} style={{ ...inputStyle, width: 60 }}>
                <option value="high">높음</option><option value="mid">중간</option><option value="low">낮음</option>
              </select>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} style={{ ...inputStyle, width: 130 }} />
              <button onClick={addTodo} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sortedTodos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}`, opacity: t.done ? 0.4 : 1 }}>
                  <button onClick={() => toggleTodo(t.id)} style={{ width: 18, height: 18, borderRadius: 3, border: `1.5px solid ${PRIORITY_COLORS[t.priority]}`, background: t.done ? PRIORITY_COLORS[t.priority] : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.fg, fontSize: 10 }}>{t.done ? 'v' : ''}</button>
                  <span style={{ flex: 1, fontSize: 12, color: rgba(T.fg, 0.8), textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                  {t.due && <span style={{ fontSize: 9, color: rgba(T.gold, 0.5) }}>{t.due}</span>}
                  <button onClick={() => removeTodo(t.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.5), cursor: 'pointer', fontSize: 11 }}>x</button>
                </div>
              ))}
              {todos.length === 0 && <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 30 }}>할일이 없습니다</div>}
            </div>
          </>
        )}

        {tab === 'template' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {templates.map(t => (
                <div key={t.id} style={{ padding: '8px 12px', borderRadius: 4, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: rgba(T.gold, 0.5), background: rgba(T.gold, 0.06), padding: '1px 6px', borderRadius: 3 }}>{t.category}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: rgba(T.fg, 0.8) }}>{t.name}</span>
                    <button onClick={() => copyTemplate(t.id, t.content)} style={{ background: 'none', border: 'none', color: copied === t.id ? T.teal : rgba(T.gold, 0.5), cursor: 'pointer', fontSize: 10 }}>{copied === t.id ? '복사됨' : '복사'}</button>
                    <button onClick={() => removeTemplate(t.id)} style={{ background: 'none', border: 'none', color: rgba(T.danger, 0.5), cursor: 'pointer', fontSize: 11 }}>x</button>
                  </div>
                  <div style={{ fontSize: 11, color: rgba(T.fg, 0.5), whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{t.content}</div>
                </div>
              ))}
              {templates.length === 0 && <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 30 }}>템플릿이 없습니다</div>}
            </div>
            <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.08)}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newTmplName} onChange={e => setNewTmplName(e.target.value)} placeholder="템플릿 이름" style={{ ...inputStyle, flex: 1 }} />
                <input value={newTmplCat} onChange={e => setNewTmplCat(e.target.value)} placeholder="카테고리" style={{ ...inputStyle, width: 80 }} />
              </div>
              <textarea value={newTmplContent} onChange={e => setNewTmplContent(e.target.value)} placeholder="템플릿 내용..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              <button onClick={addTemplate} style={{ alignSelf: 'flex-end', padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>추가</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
