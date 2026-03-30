import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'

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

export default function ReminderModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming')
  const [adding, setAdding] = useState(false)
  const [fileName, setFileName] = useState('')
  const [filePath, setFilePath] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [time, setTime] = useState('09:00')

  useEffect(() => {
    window.api.reminders.get().then(setReminders).catch(() => {})
  }, [])

  const upcoming = reminders
    .filter((r) => !r.done)
    .sort((a, b) => a.remindAt - b.remindAt)

  const done = reminders
    .filter((r) => r.done)
    .sort((a, b) => b.remindAt - a.remindAt)

  const add = async (): Promise<void> => {
    if (!fileName.trim() || !date) return
    const remindAt = new Date(`${date}T${time}:00`).getTime()
    const updated = await window.api.reminders.add({
      filePath,
      fileName: fileName.trim(),
      note: note.trim(),
      remindAt
    })
    setReminders(updated)
    setAdding(false)
    setFileName('')
    setFilePath('')
    setNote('')
  }

  const remove = async (id: string): Promise<void> => {
    const updated = await window.api.reminders.delete(id)
    setReminders(updated)
  }

  const markDone = async (id: string): Promise<void> => {
    const updated = await window.api.reminders.markDone(id)
    setReminders(updated)
  }

  return (
    <Modal title="파일 리마인더" onClose={onClose} asPanel={asPanel}>
      <div className="space-y-3">
        {/* 탭 */}
        <div className="flex gap-1">
          <button
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === 'upcoming' ? 'bg-[#0078d4] text-white' : ''}`}
            style={tab !== 'upcoming' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab('upcoming')}
          >
            예정 {upcoming.length > 0 && `(${upcoming.length})`}
          </button>
          <button
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === 'done' ? 'bg-[#0078d4] text-white' : ''}`}
            style={tab !== 'done' ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab('done')}
          >
            완료 {done.length > 0 && `(${done.length})`}
          </button>
          <div className="flex-1" />
          <button
            className="win-btn-primary text-xs"
            onClick={() => setAdding(!adding)}
          >
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
                onChange={(e) => setFileName(e.target.value)}
                placeholder="파일명 또는 작업 제목"
                autoFocus
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>파일 경로</label>
              <input
                className="win-input flex-1 text-xs"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
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
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="알림에 표시될 메모"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>날짜</label>
              <input
                className="win-input text-xs"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                className="win-input text-xs w-24"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button className="win-btn-secondary text-xs" onClick={() => setAdding(false)}>취소</button>
              <button
                className="win-btn-primary text-xs"
                onClick={add}
                disabled={!fileName.trim() || !date}
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* 예정 목록 */}
        {tab === 'upcoming' && (
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
                <div className="text-4xl mb-2">🔔</div>
                <div className="text-sm">예정된 리마인더가 없습니다.</div>
                <div className="text-xs mt-1" style={{ color: 'var(--win-border)' }}>+ 새 리마인더를 눌러 추가하세요.</div>
              </div>
            )}
            {upcoming.map((r) => {
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
                    <div className={`text-xs mt-1 ${due ? 'text-[#c42b1c]' : soon ? 'text-[#f97316]' : ''}`} style={!due && !soon ? { color: 'var(--win-text-muted)' } : undefined}>
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
                    <button
                      className="win-btn-secondary text-xs"
                      onClick={() => markDone(r.id)}
                      title="완료 처리"
                    >
                      ✓
                    </button>
                    <button
                      className="win-btn-danger text-xs"
                      onClick={() => remove(r.id)}
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 완료 목록 */}
        {tab === 'done' && (
          <div className="space-y-1">
            {done.length === 0 && (
              <div className="text-center py-6 text-sm" style={{ color: 'var(--win-text-muted)' }}>완료된 리마인더가 없습니다.</div>
            )}
            {done.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded text-xs" style={{ border: '1px solid var(--win-surface-2)' }}>
                <span style={{ color: 'var(--win-border)' }}>✓</span>
                <span className="flex-1 truncate" style={{ color: 'var(--win-text-muted)' }}>{r.fileName}</span>
                <span style={{ color: 'var(--win-border)' }}>{formatRemindAt(r.remindAt)}</span>
                <button
                  style={{ color: 'var(--win-border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-border)' }}
                  onClick={() => remove(r.id)}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
