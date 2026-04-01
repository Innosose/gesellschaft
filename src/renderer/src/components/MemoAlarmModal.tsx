import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

// ── QuickNotes types & helpers ─────────────────────────────────────────────────

interface Note {
  id: string
  title: string
  content: string
  color: string
  updatedAt: number
}

function getNoteColors() {
  return [
    { bg: T.surface, border: rgba(T.fg, 0.15), label: '기본' },
    { bg: rgba(T.success, 0.15), border: rgba(T.success, 0.3), label: '초록' },
    { bg: rgba(T.teal, 0.15), border: rgba(T.teal, 0.3), label: '파랑' },
    { bg: rgba(T.danger, 0.15), border: rgba(T.danger, 0.3), label: '빨강' },
    { bg: rgba(T.warning, 0.15), border: rgba(T.warning, 0.3), label: '노랑' },
  ]
}

function formatNoteDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// ── Reminder types & helpers ───────────────────────────────────────────────────

interface Reminder {
  id: string
  filePath: string
  fileName: string
  note: string
  remindAt: number
  done: boolean
}

function formatRemindAt(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) +
    ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function isDue(ts: number): boolean {
  return ts <= Date.now()
}

function isDueSoon(ts: number): boolean {
  return ts - Date.now() < 24 * 60 * 60 * 1000 && ts > Date.now()
}

// ── Main component ─────────────────────────────────────────────────────────────

interface MemoAlarmModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function MemoAlarmModal({ onClose, asPanel }: MemoAlarmModalProps): React.ReactElement {
  const [tab, setTab] = useState<'memo' | 'alarm'>('memo')

  // ── QuickNotes state ──────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteColor, setNoteColor] = useState(getNoteColors()[0].bg)
  const [noteDirty, setNoteDirty] = useState(false)
  const [noteSavedMsg, setNoteSavedMsg] = useState(false)
  const noteSaveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    window.api.quickNotes.get().then(n => {
      setNotes(n)
      if (n.length > 0) selectNote(n[0])
    }).catch(() => {})
  }, [])

  useEffect(() => () => { if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current) }, [])

  const selectNote = (note: Note): void => {
    setSelectedNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteColor(note.color)
    setNoteDirty(false)
  }

  const autoSaveNote = (updTitle: string, updContent: string, updColor: string): void => {
    if (!selectedNote) return
    setNoteDirty(true)
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(async () => {
      const updated = await window.api.quickNotes.save({
        id: selectedNote.id,
        title: updTitle,
        content: updContent,
        color: updColor,
      })
      setNotes(updated)
      setNoteDirty(false)
      setNoteSavedMsg(true)
      setTimeout(() => setNoteSavedMsg(false), 1500)
    }, 800)
  }

  const newNote = async (): Promise<void> => {
    const updated = await window.api.quickNotes.save({ title: '새 메모', content: '', color: getNoteColors()[notes.length % getNoteColors().length].bg })
    setNotes(updated)
    selectNote(updated[0])
  }

  const deleteNote = async (id: string): Promise<void> => {
    const updated = await window.api.quickNotes.delete(id)
    setNotes(updated)
    if (selectedNote?.id === id) {
      if (updated.length > 0) selectNote(updated[0])
      else { setSelectedNote(null); setNoteTitle(''); setNoteContent('') }
    }
  }

  // ── Reminder state ────────────────────────────────────────────────────────
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [reminderTab, setReminderTab] = useState<'upcoming' | 'done'>('upcoming')
  const [adding, setAdding] = useState(false)
  const [fileName, setFileName] = useState('')
  const [filePath, setFilePath] = useState('')
  const [remNote, setRemNote] = useState('')
  const [remDate, setRemDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [remTime, setRemTime] = useState('09:00')

  useEffect(() => {
    window.api.reminders.get().then(setReminders).catch(() => {})
  }, [])

  const upcomingReminders = reminders
    .filter(r => !r.done)
    .sort((a, b) => a.remindAt - b.remindAt)

  const doneReminders = reminders
    .filter(r => r.done)
    .sort((a, b) => b.remindAt - a.remindAt)

  const addReminder = async (): Promise<void> => {
    if (!fileName.trim() || !remDate) return
    const remindAt = new Date(`${remDate}T${remTime}:00`).getTime()
    const updated = await window.api.reminders.add({
      filePath,
      fileName: fileName.trim(),
      note: remNote.trim(),
      remindAt,
    })
    setReminders(updated)
    setAdding(false)
    setFileName('')
    setFilePath('')
    setRemNote('')
  }

  const removeReminder = async (id: string): Promise<void> => {
    const updated = await window.api.reminders.delete(id)
    setReminders(updated)
  }

  const markDone = async (id: string): Promise<void> => {
    const updated = await window.api.reminders.markDone(id)
    setReminders(updated)
  }

  return (
    <Modal title="메모 & 알림" onClose={onClose} asPanel={asPanel}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
        {(['memo', 'alarm'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === t ? rgba(T.fg, 0.12) : 'transparent',
            color: tab === t ? T.fg : rgba(T.fg, 0.45),
            transition: 'all 0.15s',
          }}>{t === 'memo' ? '메모' : '알림'}</button>
        ))}
      </div>

      {/* ── 메모 탭 ── */}
      {tab === 'memo' && (
        <div className="flex gap-3" style={{ height: 380 }}>
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
                  className="group relative cursor-pointer p-2 rounded-lg border text-xs transition-colors"
                  style={{
                    backgroundColor: n.color,
                    borderColor: selectedNote?.id === n.id ? 'var(--win-accent)' : 'var(--win-surface-2)',
                  }}
                  onMouseEnter={e => { if (selectedNote?.id !== n.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-border)' }}
                  onMouseLeave={e => { if (selectedNote?.id !== n.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-surface-2)' }}
                  onClick={() => selectNote(n)}
                >
                  <div className="font-medium truncate pr-4" style={{ color: 'var(--win-text)' }}>{n.title || '(제목 없음)'}</div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--win-text-muted)' }}>{n.content.slice(0, 40) || '내용 없음'}</div>
                  <button
                    className="absolute top-1.5 right-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--win-text-muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                    onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* 에디터 */}
          <div className="flex-1 flex flex-col gap-2">
            {selectedNote ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    className="win-input flex-1 text-sm font-medium"
                    value={noteTitle}
                    onChange={e => { setNoteTitle(e.target.value); autoSaveNote(e.target.value, noteContent, noteColor) }}
                    placeholder="제목"
                  />
                  <div className="flex gap-1">
                    {getNoteColors().map(c => (
                      <button
                        key={c.bg}
                        className={`w-4 h-4 rounded-full border transition-all ${noteColor === c.bg ? 'scale-125' : 'border-transparent'}`}
                        style={{
                          backgroundColor: c.bg === T.surface ? rgba(T.fg, 0.25) : c.bg,
                          borderColor: noteColor === c.bg ? 'var(--win-text)' : 'transparent',
                        }}
                        onClick={() => { setNoteColor(c.bg); autoSaveNote(noteTitle, noteContent, c.bg) }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  {noteDirty && <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>저장 중...</span>}
                  {noteSavedMsg && !noteDirty && <span className="text-[10px]" style={{ color: 'var(--win-success)' }}>✓ 저장됨</span>}
                </div>
                <textarea
                  className="flex-1 win-input resize-none text-sm leading-relaxed"
                  value={noteContent}
                  onChange={e => { setNoteContent(e.target.value); autoSaveNote(noteTitle, e.target.value, noteColor) }}
                  placeholder="메모 내용을 입력하세요..."
                />
                <div className="text-[10px] text-right" style={{ color: 'var(--win-border)' }}>
                  마지막 수정: {formatNoteDate(selectedNote.updatedAt)}
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
      )}

      {/* ── 알림 탭 ── */}
      {tab === 'alarm' && (
        <div className="space-y-3">
          {/* 내부 탭 (예정 / 완료) */}
          <div className="flex gap-1">
            <button
              className={`text-xs px-3 py-1.5 rounded transition-colors ${reminderTab === 'upcoming' ? 'bg-[#0078d4] text-white' : ''}`}
              style={reminderTab !== 'upcoming' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
              onClick={() => setReminderTab('upcoming')}
            >
              예정 {upcomingReminders.length > 0 && `(${upcomingReminders.length})`}
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded transition-colors ${reminderTab === 'done' ? 'bg-[#0078d4] text-white' : ''}`}
              style={reminderTab !== 'done' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
              onClick={() => setReminderTab('done')}
            >
              완료 {doneReminders.length > 0 && `(${doneReminders.length})`}
            </button>
            <div className="flex-1" />
            <button className="win-btn-primary text-xs" onClick={() => setAdding(!adding)}>
              + 새 리마인더
            </button>
          </div>

          {/* 추가 폼 */}
          {adding && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-border)' }}>
              <div className="flex gap-2 items-center">
                <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>파일/작업</label>
                <input
                  className="win-input flex-1 text-xs"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="파일명 또는 작업 제목"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>파일 경로</label>
                <input
                  className="win-input flex-1 text-xs"
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                  placeholder="(선택) 파일 경로 — 알림 클릭 시 탐색기에서 열림"
                />
                <button
                  className="win-btn-secondary text-xs"
                  onClick={async () => {
                    const dir = await window.api.dialog.openDirectory()
                    if (dir) setFilePath(dir)
                  }}
                >
                  찾기
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>메모</label>
                <input
                  className="win-input flex-1 text-xs"
                  value={remNote}
                  onChange={e => setRemNote(e.target.value)}
                  placeholder="알림에 표시될 메모"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>날짜</label>
                <input
                  className="win-input text-xs"
                  type="date"
                  value={remDate}
                  onChange={e => setRemDate(e.target.value)}
                />
                <input
                  className="win-input text-xs w-24"
                  type="time"
                  value={remTime}
                  onChange={e => setRemTime(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button className="win-btn-secondary text-xs" onClick={() => setAdding(false)}>취소</button>
                <button
                  className="win-btn-primary text-xs"
                  onClick={addReminder}
                  disabled={!fileName.trim() || !remDate}
                >
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 예정 목록 */}
          {reminderTab === 'upcoming' && (
            <div className="space-y-2">
              {upcomingReminders.length === 0 && (
                <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
                  <div className="text-4xl mb-2">🔔</div>
                  <div className="text-sm">예정된 리마인더가 없습니다.</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--win-border)' }}>+ 새 리마인더를 눌러 추가하세요.</div>
                </div>
              )}
              {upcomingReminders.map(r => {
                const due = isDue(r.remindAt)
                const soon = isDueSoon(r.remindAt)
                return (
                  <div
                    key={r.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      due
                        ? 'border-[#c42b1c40] bg-[#c42b1c10]'
                        : soon
                          ? 'border-[#f9731640] bg-[#f9731610]'
                          : ''
                    }`}
                    style={!due && !soon ? { borderColor: 'var(--win-border)', background: 'var(--win-surface-2)' } : undefined}
                  >
                    <div className="text-xl flex-shrink-0 mt-0.5">
                      {due ? '🔴' : soon ? '🟡' : '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--win-text)' }}>{r.fileName}</div>
                      {r.note && <div className="text-xs mt-0.5" style={{ color: 'var(--win-text-muted)' }}>{r.note}</div>}
                      <div
                        className={`text-xs mt-1 ${due ? 'text-[#c42b1c]' : soon ? 'text-[#f97316]' : ''}`}
                        style={!due && !soon ? { color: 'var(--win-text-muted)' } : undefined}
                      >
                        {due ? '⚠️ 기한 지남 — ' : ''}{formatRemindAt(r.remindAt)}
                      </div>
                      {r.filePath && (
                        <button
                          className="text-xs text-[#0078d4] hover:underline mt-0.5"
                          onClick={() => window.api.fs.showInExplorer(r.filePath)}
                        >
                          📁 탐색기에서 보기
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="win-btn-secondary text-xs" onClick={() => markDone(r.id)} title="완료 처리">✓</button>
                      <button className="win-btn-danger text-xs" onClick={() => removeReminder(r.id)} title="삭제">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 완료 목록 */}
          {reminderTab === 'done' && (
            <div className="space-y-1">
              {doneReminders.length === 0 && (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--win-text-muted)' }}>완료된 리마인더가 없습니다.</div>
              )}
              {doneReminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded text-xs" style={{ border: '1px solid var(--win-surface-2)' }}>
                  <span style={{ color: 'var(--win-border)' }}>✓</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--win-text-muted)' }}>{r.fileName}</span>
                  <span style={{ color: 'var(--win-border)' }}>{formatRemindAt(r.remindAt)}</span>
                  <button
                    style={{ color: 'var(--win-border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-border)' }}
                    onClick={() => removeReminder(r.id)}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
