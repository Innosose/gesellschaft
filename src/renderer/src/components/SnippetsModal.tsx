import React from 'react'
import { Modal } from './SearchModal'

interface Snippet {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
}

const STORAGE_KEY = 'gs_snippets'

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSnippets(snippets: Snippet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
}

function genId(): string {
  return `snip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface SnippetsModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function SnippetsModal({ onClose, asPanel }: SnippetsModalProps): React.ReactElement {
  const [snippets, setSnippets] = React.useState<Snippet[]>(() => loadSnippets())
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const selected = snippets.find(s => s.id === selectedId) || null

  const filtered = snippets.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
  })

  const updateSnippet = (id: string, patch: Partial<Snippet>): void => {
    setSnippets(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...patch } : s)
      saveSnippets(updated)
      return updated
    })
  }

  const handleNew = (): void => {
    const s: Snippet = { id: genId(), title: '새 스니펫', content: '', tags: [], createdAt: Date.now() }
    setSnippets(prev => {
      const updated = [s, ...prev]
      saveSnippets(updated)
      return updated
    })
    setSelectedId(s.id)
  }

  const handleDelete = (id: string): void => {
    setSnippets(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveSnippets(updated)
      return updated
    })
    if (selectedId === id) setSelectedId(null)
  }

  const handleCopy = async (content: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <Modal title="스니펫 관리" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 0, height: '100%' }}>
        {/* 왼쪽 목록 */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--win-border)',
            paddingRight: 12,
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="win-input"
              style={{ flex: 1 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색..."
            />
            <button className="win-btn-primary" style={{ whiteSpace: 'nowrap', padding: '0 12px', fontSize: 12 }} onClick={handleNew}>
              + 새 스니펫
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
                {snippets.length === 0 ? '스니펫이 없습니다.\n"새 스니펫" 버튼으로 추가하세요.' : '검색 결과 없음'}
              </div>
            ) : (
              filtered.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: selectedId === s.id ? 'var(--win-accent-dim)' : 'transparent',
                    border: selectedId === s.id ? '1px solid var(--win-accent)' : '1px solid transparent',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--win-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || '(제목 없음)'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                    {s.content.slice(0, 60) || '(내용 없음)'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {s.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '1px 6px',
                          background: 'var(--win-surface-3)',
                          borderRadius: 10,
                          fontSize: 10,
                          color: 'var(--win-accent)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    <button
                      className="win-btn-ghost"
                      style={{ marginLeft: 'auto', padding: '1px 6px', fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); handleCopy(s.content, s.id) }}
                    >
                      {copiedId === s.id ? '✅' : '복사'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽 편집 */}
        <div style={{ flex: 1, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>제목</label>
                <button
                  className="win-btn-danger"
                  style={{ padding: '2px 10px', fontSize: 12 }}
                  onClick={() => handleDelete(selected.id)}
                >
                  삭제
                </button>
              </div>
              <input
                className="win-input"
                value={selected.title}
                onChange={e => updateSnippet(selected.id, { title: e.target.value })}
                onBlur={e => updateSnippet(selected.id, { title: e.target.value })}
                placeholder="스니펫 제목..."
              />

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>태그</label>
                <input
                  className="win-input"
                  value={selected.tags.join(', ')}
                  onChange={e => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    updateSnippet(selected.id, { tags })
                  }}
                  placeholder="태그1, 태그2, ..."
                />
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>쉼표로 구분</div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>내용</label>
                  <button
                    className="win-btn-ghost"
                    style={{ padding: '2px 10px', fontSize: 12 }}
                    onClick={() => handleCopy(selected.content, selected.id + '_editor')}
                  >
                    {copiedId === selected.id + '_editor' ? '✅ 복사됨' : '복사'}
                  </button>
                </div>
                <textarea
                  className="win-textarea"
                  style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13, minHeight: 200 }}
                  value={selected.content}
                  onChange={e => updateSnippet(selected.id, { content: e.target.value })}
                  onBlur={e => updateSnippet(selected.id, { content: e.target.value })}
                  placeholder="스니펫 내용..."
                />
              </div>

              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
                생성일: {new Date(selected.createdAt).toLocaleDateString('ko-KR')} · 자동 저장됨
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 14 }}>
              왼쪽 목록에서 스니펫을 선택하거나<br />"새 스니펫" 버튼으로 추가하세요.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
