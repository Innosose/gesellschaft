import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'
import { sanitizeHtml } from '../utils/sanitize'

interface Doc { id: number; title: string; content: string; updatedAt: string }

const STORAGE_KEY = 'gs-markdown-docs'
let nextId = 1

function load(): Doc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const docs = JSON.parse(raw) as Doc[]
    nextId = Math.max(...docs.map(d => d.id), 0) + 1
    return docs
  } catch { return [] }
}

function renderMd(src: string): string {
  let html = src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#16140e;padding:8px;border-radius:6px;overflow-x:auto;font-size:12px;color:#a5b4fc"><code>$1</code></pre>')
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#16140e;padding:1px 4px;border-radius:3px;font-size:12px;color:#a5b4fc">$1</code>')
  // headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#fff;margin:10px 0 4px">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:#fff;margin:12px 0 4px">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;color:#fff;margin:14px 0 6px">$1</h1>')
  // bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color:${T.teal};text-decoration:underline">$1</a>`)
  // unordered list
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
  // ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal">$1</li>')
  // line breaks
  html = html.replace(/\n/g, '<br/>')
  return html
}

export default function MarkdownEditorModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [docs, setDocs] = useState<Doc[]>(load)
  const [activeId, setActiveId] = useState<number | null>(docs[0]?.id ?? null)
  const [content, setContent] = useState(docs[0]?.content ?? '')
  const [title, setTitle] = useState(docs[0]?.title ?? '')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(docs)) }, [docs])

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) ?? null, [docs, activeId])

  const selectDoc = useCallback((d: Doc) => {
    setActiveId(d.id); setTitle(d.title); setContent(d.content)
  }, [])

  const saveDoc = useCallback(() => {
    if (activeId === null) return
    const now = new Date().toLocaleString('ko-KR')
    setDocs(prev => prev.map(d => d.id === activeId ? { ...d, title: title || '제목 없음', content, updatedAt: now } : d))
  }, [activeId, title, content])

  const newDoc = useCallback(() => {
    const now = new Date().toLocaleString('ko-KR')
    const doc: Doc = { id: nextId++, title: '새 문서', content: '', updatedAt: now }
    setDocs(prev => [doc, ...prev])
    selectDoc(doc)
  }, [selectDoc])

  const deleteDoc = useCallback((id: number) => {
    setDocs(prev => prev.filter(d => d.id !== id))
    if (activeId === id) { setActiveId(null); setContent(''); setTitle('') }
  }, [activeId])

  const preview = useMemo(() => renderMd(content), [content])

  return (
    <Modal title="마크다운 에디터" onClose={onClose} asPanel={asPanel} wide>
      <div style={{ display: 'flex', gap: 10, height: '100%', minHeight: 400 }}>
        {/* Sidebar */}
        <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="win-btn-primary" onClick={newDoc} style={{ fontSize: 12, width: '100%' }}>+ 새 문서</button>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {docs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 11, padding: 20 }}>문서가 없습니다</div>}
            {docs.map(d => (
              <div key={d.id} onClick={() => selectDoc(d)} style={{
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                background: d.id === activeId ? 'rgba(123,143,255,0.15)' : 'transparent',
                color: d.id === activeId ? T.teal : 'var(--win-text-sub)',
                border: d.id === activeId ? '1px solid rgba(123,143,255,0.3)' : '1px solid transparent',
              }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 2 }}>{d.updatedAt}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Editor + Preview */}
        {activeDoc ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="win-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" style={{ flex: 1 }} />
              <button className="win-btn-primary" onClick={saveDoc} style={{ fontSize: 12 }}>저장</button>
              <button className="win-btn-danger" onClick={() => deleteDoc(activeDoc.id)} style={{ fontSize: 12 }}>삭제</button>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
              <textarea
                className="win-input"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="마크다운을 입력하세요..."
                style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 12, minHeight: 300 }}
              />
              <div style={{
                flex: 1, overflowY: 'auto', padding: 12, borderRadius: 8,
                background: 'var(--win-surface-2)', border: '1px solid var(--win-border)',
                fontSize: 13, color: 'var(--win-text-sub)', lineHeight: 1.6,
              }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview) }} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
            문서를 선택하거나 새로 만드세요
          </div>
        )}
      </div>
    </Modal>
  )
}
