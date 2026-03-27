import React from 'react'
import { Modal } from './SearchModal'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  updatedAt: number
}

const STORAGE_KEY = 'gs_email_templates'

function loadTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTemplates(templates: EmailTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

function genId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface EmailTemplateModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function EmailTemplateModal({ onClose, asPanel }: EmailTemplateModalProps): React.ReactElement {
  const [templates, setTemplates] = React.useState<EmailTemplate[]>(() => loadTemplates())
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editSubject, setEditSubject] = React.useState('')
  const [editBody, setEditBody] = React.useState('')
  const [savedMsg, setSavedMsg] = React.useState(false)
  const [copiedMsg, setCopiedMsg] = React.useState('')

  const selected = templates.find(t => t.id === selectedId) || null

  React.useEffect(() => {
    if (selected) {
      setEditName(selected.name)
      setEditSubject(selected.subject)
      setEditBody(selected.body)
    }
  }, [selectedId])

  const handleNew = (): void => {
    const t: EmailTemplate = { id: genId(), name: '새 템플릿', subject: '', body: '', updatedAt: Date.now() }
    setTemplates(prev => {
      const updated = [t, ...prev]
      saveTemplates(updated)
      return updated
    })
    setSelectedId(t.id)
  }

  const handleSave = (): void => {
    if (!selectedId) return
    setTemplates(prev => {
      const updated = prev.map(t =>
        t.id === selectedId
          ? { ...t, name: editName, subject: editSubject, body: editBody, updatedAt: Date.now() }
          : t
      )
      saveTemplates(updated)
      return updated
    })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 1500)
  }

  const handleDelete = (): void => {
    if (!selectedId) return
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== selectedId)
      saveTemplates(updated)
      return updated
    })
    setSelectedId(null)
  }

  const handleCopySubject = async (): Promise<void> => {
    await navigator.clipboard.writeText(editSubject)
    setCopiedMsg('제목 복사됨')
    setTimeout(() => setCopiedMsg(''), 1500)
  }

  const handleCopyBody = async (): Promise<void> => {
    await navigator.clipboard.writeText(editBody)
    setCopiedMsg('본문 복사됨')
    setTimeout(() => setCopiedMsg(''), 1500)
  }

  const handleCopyAll = async (): Promise<void> => {
    await navigator.clipboard.writeText(`제목: ${editSubject}\n\n${editBody}`)
    setCopiedMsg('전체 복사됨')
    setTimeout(() => setCopiedMsg(''), 1500)
  }

  return (
    <Modal title="이메일 템플릿 관리" onClose={onClose} asPanel={asPanel}>
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
    </Modal>
  )
}
