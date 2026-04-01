import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Snippet { id: number; title: string; lang: string; code: string; tags: string[]; createdAt: string }

const STORAGE_KEY = 'gs-code-snippets'
const LANGS = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'HTML/CSS', 'SQL', 'Bash', 'Go', 'Rust', '기타']
let nextId = 1

function load(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const s = JSON.parse(raw) as Snippet[]
    nextId = Math.max(...s.map(x => x.id), 0) + 1
    return s
  } catch { return [] }
}

const KEYWORDS: Record<string, string[]> = {
  JavaScript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'true', 'false', 'null', 'undefined', 'try', 'catch', 'throw'],
  TypeScript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'interface', 'type', 'enum', 'new', 'this', 'true', 'false', 'null', 'undefined'],
  Python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'try', 'except', 'with', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'pass'],
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

function colorize(code: string, lang: string): string {
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // strings
  html = html.replace(/(["'`])(?:(?!\1).)*?\1/g, '<span style="color:#a5d6a7">$&</span>')
  // comments
  html = html.replace(/(\/\/.*$)/gm, '<span style="color:#666">$&</span>')
  html = html.replace(/(#.*$)/gm, '<span style="color:#666">$&</span>')
  // numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f48fb1">$1</span>')
  // keywords
  const kws = KEYWORDS[lang] || KEYWORDS['JavaScript'] || []
  kws.forEach(kw => {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span style="color:#ce93d8">$1</span>')
  })
  return html
}

export default function CodeSnippetModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [snippets, setSnippets] = useState<Snippet[]>(load)
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [lang, setLang] = useState('JavaScript')
  const [code, setCode] = useState('')
  const [tags, setTags] = useState('')
  const [viewing, setViewing] = useState<Snippet | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets)) }, [snippets])

  const add = useCallback(() => {
    if (!title.trim() || !code.trim()) return
    const now = new Date().toLocaleString('ko-KR')
    setSnippets(prev => [{ id: nextId++, title: title.trim(), lang, code, tags: tags.split(',').map(t => t.trim()).filter(Boolean), createdAt: now }, ...prev])
    setTitle(''); setCode(''); setTags('')
  }, [title, lang, code, tags])

  const remove = useCallback((id: number) => {
    setSnippets(prev => prev.filter(s => s.id !== id))
    if (viewing?.id === id) setViewing(null)
  }, [viewing])

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return snippets
    const q = search.toLowerCase()
    return snippets.filter(s => s.title.toLowerCase().includes(q) || s.lang.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)))
  }, [snippets, search])

  return (
    <Modal title="코드 스니펫" onClose={onClose} asPanel={asPanel} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {!viewing ? (
          <>
            {/* Add form */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" style={{ flex: 1, minWidth: 120 }} />
              <select className="win-input" value={lang} onChange={e => setLang(e.target.value)} style={{ width: 130 }}>
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <input className="win-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="태그 (쉼표 구분)" style={{ flex: 1, minWidth: 120 }} />
            </div>
            <textarea className="win-input" value={code} onChange={e => setCode(e.target.value)} placeholder="코드를 입력하세요..." style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 80, resize: 'none' }} />
            <button className="win-btn-primary" onClick={add} style={{ alignSelf: 'flex-start', fontSize: 12 }}>스니펫 저장</button>
            {/* Search */}
            <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ width: '100%' }} />
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>스니펫이 없습니다</div>}
              {filtered.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', cursor: 'pointer' }} onClick={() => setViewing(s)}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: rgba(T.teal, 0.15), color: T.teal, fontWeight: 600 }}>{s.lang}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{s.title}</span>
                  {s.tags.map(t => <span key={t} style={{ fontSize: 10, color: 'var(--win-text-muted)', background: rgba(T.fg, 0.05), padding: '1px 5px', borderRadius: 3 }}>#{t}</span>)}
                  <button className="win-btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={e => { e.stopPropagation(); remove(s.id) }}>삭제</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="win-btn-ghost" onClick={() => setViewing(null)} style={{ fontSize: 12 }}>← 목록</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--win-text)' }}>{viewing.title}</span>
              <span style={{ fontSize: 11, color: T.teal, background: rgba(T.teal, 0.15), padding: '2px 8px', borderRadius: 4 }}>{viewing.lang}</span>
              <div style={{ flex: 1 }} />
              <button className="win-btn-secondary" onClick={() => copy(viewing.code)} style={{ fontSize: 12 }}>{copied ? '복사됨!' : '복사'}</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, background: T.bg, border: '1px solid var(--win-border)', padding: 16 }}>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(colorize(viewing.code, viewing.lang)) }} />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
