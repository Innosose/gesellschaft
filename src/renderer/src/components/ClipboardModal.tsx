import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'

const PIN_KEY = 'gesellschaft-clipboard-pins'
function loadPins(): string[] {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) ?? '[]') } catch { return [] }
}

export default function ClipboardModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [history, setHistory] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pins, setPins] = useState<string[]>(loadPins)

  const togglePin = (text: string): void => {
    setPins(prev => {
      const next = prev.includes(text) ? prev.filter(p => p !== text) : [text, ...prev]
      localStorage.setItem(PIN_KEY, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    window.api.clipboard.getHistory().then(setHistory).catch(() => {})
    const unsub = window.api.clipboard.onUpdated(setHistory)
    return unsub
  }, [])

  const copy = async (text: string): Promise<void> => {
    await window.api.clipboard.copy(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  const remove = async (text: string): Promise<void> => {
    const updated = await window.api.clipboard.remove(text)
    setHistory(updated)
    setPins(prev => {
      const next = prev.filter(p => p !== text)
      localStorage.setItem(PIN_KEY, JSON.stringify(next))
      return next
    })
  }

  const clear = async (): Promise<void> => {
    const updated = await window.api.clipboard.clear()
    setHistory(updated)
  }

  const baseList = search.trim()
    ? history.filter(h => h.toLowerCase().includes(search.toLowerCase()))
    : history
  const pinnedInView = baseList.filter(h => pins.includes(h))
  const unpinned = baseList.filter(h => !pins.includes(h))
  const filtered = [...pinnedInView, ...unpinned]

  return (
    <Modal title="클립보드 히스토리" onClose={onClose} asPanel={asPanel}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="win-input flex-1 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="히스토리 검색..."
          />
          {history.length > 0 && (
            <button className="win-btn-secondary text-xs" onClick={clear}>전체 삭제</button>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color: 'var(--win-text-muted)' }}>
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm">{history.length === 0 ? '복사한 내용이 없습니다.' : '검색 결과가 없습니다.'}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--win-border)' }}>텍스트를 복사하면 자동으로 기록됩니다.</div>
          </div>
        )}

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
          {filtered.map((item, i) => {
            const isCopied = copied === item
            const isPinned = pins.includes(item)
            const isMultiline = item.includes('\n')
            const preview = isMultiline ? item.split('\n').slice(0, 3).join('\n') + (item.split('\n').length > 3 ? '\n...' : '') : item
            const showSeparator = i === pinnedInView.length && pinnedInView.length > 0 && unpinned.length > 0

            return (
              <React.Fragment key={item}>
                {showSeparator && (
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--win-text-muted)' }}>
                    <div className="flex-1 h-px" style={{ background: 'var(--win-border)' }} />
                    <span>기타</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--win-border)' }} />
                  </div>
                )}
                <div
                  className="group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: isPinned ? 'var(--win-surface-2)' : 'var(--win-bg)', border: `1px solid ${isPinned ? 'var(--win-border)' : 'var(--win-surface)'}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--win-border)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isPinned ? 'var(--win-border)' : 'var(--win-surface)' }}
                  onClick={() => copy(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {isPinned && <span className="text-[10px]" style={{ color: 'var(--win-accent)' }}>📌</span>}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-all line-clamp-3 font-sans leading-relaxed" style={{ color: 'var(--win-text-sub)' }}>
                      {preview}
                    </pre>
                    {isMultiline && (
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--win-text-muted)' }}>{item.split('\n').length}줄</div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={{ background: 'var(--win-surface)', color: isPinned ? 'var(--win-accent)' : 'var(--win-text-muted)' }}
                      title={isPinned ? '고정 해제' : '고정'}
                      onClick={e => { e.stopPropagation(); togglePin(item) }}
                    >
                      {isPinned ? '📌' : '📍'}
                    </button>
                    <button
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={isCopied ? { background: '#1e7e34', color: 'var(--win-text)' } : { background: 'var(--win-surface)', color: 'var(--win-text-muted)' }}
                      onMouseEnter={(e) => { if (!isCopied) (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)' }}
                      onMouseLeave={(e) => { if (!isCopied) (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                      onClick={e => { e.stopPropagation(); copy(item) }}
                    >
                      {isCopied ? '✓' : '복사'}
                    </button>
                    <button
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={{ background: 'var(--win-surface)', color: 'var(--win-text-muted)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-danger)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                      onClick={e => { e.stopPropagation(); remove(item) }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        <div className="text-xs text-right" style={{ color: 'var(--win-border)' }}>{history.length}개 항목 저장됨</div>
      </div>
    </Modal>
  )
}
