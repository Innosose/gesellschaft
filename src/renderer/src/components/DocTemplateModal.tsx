import React from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  updatedAt: number
}

interface Snippet {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface DocTemplateModalProps {
  onClose: () => void
  asPanel?: boolean
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DocTemplateModal({ onClose, asPanel }: DocTemplateModalProps): React.ReactElement {
  const [tab, setTab] = React.useState<'email' | 'snippets'>('email')

  return (
    <Modal title="문서 템플릿" onClose={onClose} asPanel={asPanel}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
        {(['email', 'snippets'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === t ? rgba(T.fg, 0.12) : 'transparent',
            color: tab === t ? T.fg : rgba(T.fg, 0.45),
            transition: 'all 0.15s',
          }}>
            {t === 'email' ? '이메일 템플릿' : '상용구'}
          </button>
        ))}
      </div>

      {tab === 'email' && <EmailTemplateTab />}
      {tab === 'snippets' && <SnippetsTab />}
    </Modal>
  )
}


// ── Email Template Tab ─────────────────────────────────────────────────────────

function EmailTemplateTab(): React.ReactElement {
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editSubject, setEditSubject] = React.useState('')
  const [editBody, setEditBody] = React.useState('')
  const [savedMsg, setSavedMsg] = React.useState(false)
  const [copiedMsg, setCopiedMsg] = React.useState('')

  React.useEffect(() => {
    window.api.emailTemplates.get().then(setTemplates)
  }, [])

  const selected = templates.find(t => t.id === selectedId) || null

  React.useEffect(() => {
    if (selected) {
      setEditName(selected.name)
      setEditSubject(selected.subject)
      setEditBody(selected.body)
    }
  }, [selectedId])

  const handleNew = async (): Promise<void> => {
    const updated = await window.api.emailTemplates.save({ name: '새 템플릿', subject: '', body: '' })
    setTemplates(updated)
    if (updated.length > 0) setSelectedId(updated[0].id)
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedId) return
    const updated = await window.api.emailTemplates.save({
      id: selectedId,
      name: editName,
      subject: editSubject,
      body: editBody,
    })
    setTemplates(updated)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 1500)
  }

  const handleDelete = async (): Promise<void> => {
    if (!selectedId) return
    const updated = await window.api.emailTemplates.delete(selectedId)
    setTemplates(updated)
    setSelectedId(null)
  }

  const handleCopySubject = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(editSubject)
      setCopiedMsg('제목 복사됨')
      setTimeout(() => setCopiedMsg(''), 1500)
    } catch { /* clipboard unavailable */ }
  }

  const handleCopyBody = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(editBody)
      setCopiedMsg('본문 복사됨')
      setTimeout(() => setCopiedMsg(''), 1500)
    } catch { /* clipboard unavailable */ }
  }

  const handleCopyAll = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`제목: ${editSubject}\n\n${editBody}`)
      setCopiedMsg('전체 복사됨')
      setTimeout(() => setCopiedMsg(''), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* 왼쪽 목록 */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--win-border)',
          paddingRight: 12,
          gap: 10,
        }}
      >
        <button className="win-btn-primary" onClick={handleNew} style={{ fontSize: 12 }}>
          + 새 템플릿
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templates.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 12 }}>
              템플릿이 없습니다
            </div>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selectedId === t.id ? 'var(--win-accent-dim)' : 'transparent',
                  border: selectedId === t.id ? '1px solid var(--win-accent)' : '1px solid transparent',
                  color: 'var(--win-text)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: selectedId === t.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name || '(이름 없음)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.subject || '(제목 없음)'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 2 }}>
                  {new Date(t.updatedAt).toLocaleDateString('ko-KR')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 오른쪽 편집 */}
      <div style={{ flex: 1, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {selectedId ? (
          <>
            {/* 툴바 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button className="win-btn-primary" style={{ padding: '4px 14px', fontSize: 12 }} onClick={handleSave}>
                {savedMsg ? '✅ 저장됨' : '저장'}
              </button>
              <button className="win-btn-secondary" style={{ padding: '4px 14px', fontSize: 12 }} onClick={handleCopySubject}>
                제목 복사
              </button>
              <button className="win-btn-secondary" style={{ padding: '4px 14px', fontSize: 12 }} onClick={handleCopyBody}>
                본문 복사
              </button>
              <button className="win-btn-secondary" style={{ padding: '4px 14px', fontSize: 12 }} onClick={handleCopyAll}>
                전체 복사
              </button>
              <button className="win-btn-danger" style={{ padding: '4px 14px', fontSize: 12, marginLeft: 'auto' }} onClick={handleDelete}>
                삭제
              </button>
              {copiedMsg && (
                <span style={{ fontSize: 12, color: 'var(--win-success)' }}>✅ {copiedMsg}</span>
              )}
            </div>

            {/* 이름 */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>템플릿 이름</label>
              <input
                className="win-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="템플릿 이름..."
              />
            </div>

            {/* 제목 */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>이메일 제목</label>
              <input
                className="win-input"
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                placeholder="이메일 제목..."
              />
            </div>

            {/* 본문 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>본문</label>
              <textarea
                className="win-textarea"
                style={{ flex: 1, resize: 'none', fontSize: 13, minHeight: 200 }}
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                placeholder="이메일 본문을 입력하세요..."
              />
            </div>

            <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
              마지막 수정: {selected ? new Date(selected.updatedAt).toLocaleString('ko-KR') : '-'}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 14 }}>
            왼쪽에서 템플릿을 선택하거나<br />"새 템플릿" 버튼으로 추가하세요.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Snippets Tab ───────────────────────────────────────────────────────────────

function SnippetsTab(): React.ReactElement {
  const [snippets, setSnippets] = React.useState<Snippet[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    window.api.snippets.get().then(setSnippets)
  }, [])

  React.useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const selected = snippets.find(s => s.id === selectedId) || null

  const filtered = snippets.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
  })

  const updateSnippet = (id: string, patch: Partial<Snippet>): void => {
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      window.api.snippets.save({ id, ...patch })
    }, 500)
  }

  const handleNew = async (): Promise<void> => {
    const updated = await window.api.snippets.save({ title: '새 상용구', content: '', tags: [] })
    setSnippets(updated)
    if (updated.length > 0) setSelectedId(updated[0].id)
  }

  const handleDelete = async (id: string): Promise<void> => {
    const updated = await window.api.snippets.delete(id)
    setSnippets(updated)
    if (selectedId === id) setSelectedId(null)
  }

  const handleCopy = async (content: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
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
            + 새 상용구
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
              {snippets.length === 0 ? '상용구가 없습니다.\n"새 상용구" 버튼으로 추가하세요.' : '검색 결과 없음'}
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
              placeholder="업무 문구 제목..."
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
                placeholder="업무 문구 내용..."
              />
            </div>

            <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
              생성일: {new Date(selected.createdAt).toLocaleDateString('ko-KR')} · 자동 저장됨
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--win-text-muted)', fontSize: 14 }}>
            왼쪽 목록에서 상용구를 선택하거나<br />"새 상용구" 버튼으로 추가하세요.
          </div>
        )}
      </div>
    </div>
  )
}
