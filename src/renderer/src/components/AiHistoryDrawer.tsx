import React from 'react'
import { T, rgba } from '../utils/theme'
import type { ChatMessage } from '../../../shared/types'

export interface SavedConversation {
  id: string
  title: string
  savedAt: number
  messages: ChatMessage[]
}

interface AiHistoryDrawerProps {
  history: SavedConversation[]
  onLoad: (conv: SavedConversation) => void
  onDelete: (id: string) => void
  dark?: boolean
}

export default function AiHistoryDrawer({
  history, onLoad, onDelete, dark = false,
}: AiHistoryDrawerProps): React.ReactElement {
  const itemBg      = dark ? rgba(T.fg, 0.04) : 'var(--win-surface)'
  const itemHoverBg = dark ? rgba(T.gold, 0.12)  : 'var(--win-surface-2)'
  const itemBorder  = dark ? `1px solid ${rgba(T.fg, 0.08)}` : '1px solid var(--win-border)'
  const titleColor  = dark ? rgba(T.fg, 0.8)  : 'var(--win-text)'
  const metaColor   = dark ? rgba(T.fg, 0.52) : 'var(--win-text-muted)'
  const delColor    = dark ? rgba(T.fg, 0.45) : 'var(--win-text-muted)'
  const emptyColor  = dark ? rgba(T.fg, 0.58) : 'var(--win-text-muted)'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', color: emptyColor, fontSize: 12, marginTop: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <div>저장된 대화가 없습니다</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>채팅 창에서 💾 저장 버튼을 누르세요</div>
        </div>
      ) : history.map(conv => (
        <div
          key={conv.id}
          style={{
            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
            background: itemBg, border: itemBorder,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = itemHoverBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = itemBg }}
          onClick={() => onLoad(conv)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: titleColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.title}
            </div>
            <div style={{ fontSize: 10, color: metaColor, marginTop: 2 }}>
              {new Date(conv.savedAt).toLocaleDateString('ko-KR')} · {conv.messages.length}개 메시지
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
            className="todo-muted-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 4px', color: delColor }}
            aria-label="대화 삭제"
          >✕</button>
        </div>
      ))}
    </div>
  )
}
