import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './SearchModal'

interface Note {
  id: string
  title: string
  content: string
  color: string
  updatedAt: number
}

const COLORS = [
  { bg: '#2d2d2d', border: '#404040', label: '기본' },
  { bg: '#1a3a2a', border: '#2a5a3a', label: '초록' },
  { bg: '#1a1a3a', border: '#2a2a5a', label: '파랑' },
  { bg: '#3a1a1a', border: '#5a2a2a', label: '빨강' },
  { bg: '#2a2a1a', border: '#4a4a2a', label: '노랑' },
]

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function QuickNotesModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState(COLORS[0].bg)
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    window.api.quickNotes.get().then(n => {
      setNotes(n)
      if (n.length > 0) selectNote(n[0])
    }).catch(() => {})
  }, [])

  const selectNote = (note: Note): void => {
    setSelected(note)
    setTitle(note.title)
    setContent(note.content)
    setColor(note.color)
    setDirty(false)
  }

  const autoSave = (updTitle: string, updContent: string, updColor: string): void => {
    if (!selected) return
    setDirty(true)
    setSaveError(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await window.api.quickNotes.save({
          id: selected.id,
          title: updTitle,
          content: updContent,
          color: updColor
        })
        setNotes(updated)
        setDirty(false)
        setSavedMsg(true)
        setTimeout(() => setSavedMsg(false), 1500)
      } catch {
        setDirty(false)
        setSaveError(true)
        setTimeout(() => setSaveError(false), 3000)
      }
    }, 800)
  }

  const newNote = async (): Promise<void> => {
    const updated = await window.api.quickNotes.save({ title: '새 메모', content: '', color: COLORS[notes.length % COLORS.length].bg })
    setNotes(updated)
    selectNote(updated[0])
  }

  const deleteNote = async (id: string): Promise<void> => {
    // Cancel any pending auto-save for this note before deleting
    if (selected?.id === id && saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const updated = await window.api.quickNotes.delete(id)
    setNotes(updated)
    if (selected?.id === id) {
      if (updated.length > 0) selectNote(updated[0])
      else { setSelected(null); setTitle(''); setContent('') }
    }
  }

  return (
    <Modal title="빠른 메모" onClose={onClose} asPanel={asPanel}>
      <div className="flex gap-3 h-[380px]">
        {/* 노트 목록 */}
        <div className="w-44 flex-shrink-0 flex flex-col gap-1">
          <button className="win-btn-primary text-xs w-full mb-1" onClick={newNote}>+ 새 메모</button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {notes.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: 'var(--win-text-muted)' }}>메모 없음</div>
            )}
            {notes.map(n => (
              <div
                key={n.id}
                className={`group relative cursor-pointer p-2 rounded-lg border text-xs transition-colors`}
                style={{
                  backgroundColor: n.color,
                  borderColor: selected?.id === n.id ? 'var(--win-accent)' : 'var(--win-surface-2)'
                }}
                onMouseEnter={(e) => { if (selected?.id !== n.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-border)' }}
                onMouseLeave={(e) => { if (selected?.id !== n.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-surface-2)' }}
                onClick={() => selectNote(n)}
              >
                <div className="font-medium truncate pr-4" style={{ color: 'var(--win-text)' }}>{n.title || '(제목 없음)'}</div>
                <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--win-text-muted)' }}>{n.content.slice(0, 40) || '내용 없음'}</div>
                <button
                  className="absolute top-1.5 right-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--win-text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                  onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* 에디터 */}
        <div className="flex-1 flex flex-col gap-2">
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  className="win-input flex-1 text-sm font-medium"
                  value={title}
                  onChange={e => { setTitle(e.target.value); autoSave(e.target.value, content, color) }}
                  placeholder="제목"
                />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c.bg}
                      className={`w-4 h-4 rounded-full border transition-all ${color === c.bg ? 'scale-125' : 'border-transparent'}`}
                      style={{
                        backgroundColor: c.bg === '#2d2d2d' ? '#555' : c.bg,
                        borderColor: color === c.bg ? 'var(--win-text)' : 'transparent'
                      }}
                      onClick={() => { setColor(c.bg); autoSave(title, content, c.bg) }}
                      title={c.label}
                    />
                  ))}
                </div>
                {dirty && <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>저장 중...</span>}
                {savedMsg && !dirty && <span className="text-[10px]" style={{ color: 'var(--win-success)' }}>✓ 저장됨</span>}
                {saveError && <span className="text-[10px]" style={{ color: 'var(--win-danger)' }}>⚠ 저장 실패</span>}
              </div>
              <textarea
                className="flex-1 win-input resize-none text-sm leading-relaxed"
                value={content}
                onChange={e => { setContent(e.target.value); autoSave(title, e.target.value, color) }}
                placeholder="메모 내용을 입력하세요..."
              />
              <div className="text-[10px] text-right" style={{ color: 'var(--win-border)' }}>
                마지막 수정: {formatDate(selected.updatedAt)}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--win-text-muted)' }}>
              <div className="text-center">
                <div className="text-4xl mb-2">📝</div>
                <div className="text-sm">+ 새 메모를 눌러 시작하세요</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
