/**
 * LaunchPad — macOS Launchpad 스타일 도구 선택 패널
 *
 * 허브 클릭 시 화면 중앙에 컴팩트 창으로 표시됩니다.
 * 검색, 카테고리별 그리드, 즐겨찾기/최근 도구를 포함합니다.
 */
import React, { useState, useMemo, useCallback, memo } from 'react'

interface Tool { id: string; icon: string; label: string; color: string; description?: string }

interface LaunchPadProps {
  tools: Tool[]
  onSelect: (id: string) => void
  onClose: () => void
}

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: '핵심',     ids: ['ai', 'clipboard', 'jot', 'haste'] },
  { label: '오버레이', ids: ['notepin', 'whiteboard', 'ruler', 'xcolor', 'zone'] },
  { label: '빠른 실행', ids: ['quickCalc', 'generator', 'type', 'upload', 'keyboard'] },
  { label: '일정',     ids: ['memoAlarm', 'organizer', 'stopwatch', 'launcher'] },
  { label: '문서',     ids: ['pdfTool', 'excelTool', 'imageTools', 'diff', 'batch', 'finder'] },
  { label: '시스템',   ids: ['vault', 'yourInfo'] },
]

const RECENT_KEY = 'gesellschaft-recent-tools'
const FAV_KEY = 'gs-favorites'
const MAX_RECENT = 6

function getRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] } }
function addRecent(id: string): void {
  const prev = getRecent().filter(x => x !== id)
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)))
}
function getFavs(): string[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') } catch { return [] } }
function toggleFav(id: string): string[] {
  const f = getFavs()
  const next = f.includes(id) ? f.filter(x => x !== id) : [...f, id]
  localStorage.setItem(FAV_KEY, JSON.stringify(next))
  return next
}

const C = {
  bg: '#1e1e1e',
  surface: '#2a2a2a',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.92)',
  textSub: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.30)',
  accent: '#0a84ff',
} as const

export default function LaunchPad({ tools, onSelect, onClose }: LaunchPadProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const [recentIds, setRecentIds] = useState(getRecent)
  const [favIds, setFavIds] = useState(getFavs)

  const toolMap = useMemo(() => new Map(tools.map(t => [t.id, t])), [tools])

  const handleSelect = useCallback((id: string) => {
    if (id !== 'settings') { addRecent(id); setRecentIds(getRecent()) }
    onSelect(id)
  }, [onSelect])

  const handleToggleFav = useCallback((id: string) => {
    setFavIds(toggleFav(id))
  }, [])

  const q = query.toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return null
    return tools.filter(t =>
      t.label.toLowerCase().includes(q) || t.id.includes(q) || (t.description ?? '').toLowerCase().includes(q)
    )
  }, [tools, q])

  const favTools = useMemo(() => favIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[], [favIds, toolMap])
  const recentTools = useMemo(() => recentIds.filter(id => !favIds.includes(id)).map(id => toolMap.get(id)).filter(Boolean) as Tool[], [recentIds, favIds, toolMap])

  const categorized = useMemo(() => {
    const placed = new Set<string>()
    const groups: { label: string; tools: Tool[] }[] = []
    for (const cat of CATEGORIES) {
      const ct = cat.ids.map(id => toolMap.get(id)).filter(Boolean) as Tool[]
      if (ct.length) { groups.push({ label: cat.label, tools: ct }); ct.forEach(t => placed.add(t.id)) }
    }
    const rest = tools.filter(t => !placed.has(t.id))
    if (rest.length) groups.push({ label: '기타', tools: rest })
    return groups
  }, [tools, toolMap])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>

      <div onClick={e => e.stopPropagation()} style={{
        width: 640, maxHeight: 'min(580px, 80vh)',
        background: C.bg,
        border: `0.5px solid rgba(255,255,255,0.12)`,
        borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'windowOpen 0.2s cubic-bezier(0.16,1,0.3,1) both',
      }}>

        {/* ── 검색 바 ── */}
        <div style={{
          flexShrink: 0, padding: '14px 16px 10px',
          borderBottom: `0.5px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
            <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="도구 검색..."
            autoFocus
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: C.text, fontSize: 16, fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: C.textMuted,
              cursor: 'pointer', width: 18, height: 18, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, lineHeight: 1, padding: 0,
            }}>✕</button>
          )}
          {/* 설정 버튼 */}
          <button onClick={() => handleSelect('settings')} title="설정" style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textSub, flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" />
            </svg>
          </button>
        </div>

        {/* ── 도구 목록 ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px 16px',
          minHeight: 0,
        }}>
          {filtered ? (
            filtered.length > 0 ? (
              <ToolGrid tools={filtered} favIds={favIds} onSelect={handleSelect} onToggleFav={handleToggleFav} />
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
                결과 없음
              </div>
            )
          ) : (
            <>
              {favTools.length > 0 && (
                <Section label="즐겨찾기">
                  <ToolGrid tools={favTools} favIds={favIds} onSelect={handleSelect} onToggleFav={handleToggleFav} />
                </Section>
              )}
              {recentTools.length > 0 && (
                <Section label="최근">
                  <ToolGrid tools={recentTools} favIds={favIds} onSelect={handleSelect} onToggleFav={handleToggleFav} />
                </Section>
              )}
              {categorized.map(g => (
                <Section key={g.label} label={g.label}>
                  <ToolGrid tools={g.tools} favIds={favIds} onSelect={handleSelect} onToggleFav={handleToggleFav} />
                </Section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 섹션 헤더 ── */
function Section({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      {children}
    </div>
  )
}

/* ── 도구 그리드 ── */
const ToolGrid = memo(function ToolGrid({ tools, favIds, onSelect, onToggleFav }: {
  tools: Tool[]; favIds: string[]; onSelect: (id: string) => void; onToggleFav: (id: string) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
      gap: 4,
    }}>
      {tools.map(t => (
        <ToolCell key={t.id} tool={t} fav={favIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} />
      ))}
    </div>
  )
})

/* ── 도구 셀 ── */
const ToolCell = memo(function ToolCell({ tool, fav, onSelect, onToggleFav }: {
  tool: Tool; fav: boolean; onSelect: (id: string) => void; onToggleFav: (id: string) => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={() => onSelect(tool.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onContextMenu={e => { e.preventDefault(); onToggleFav(tool.id) }}
      title={`${tool.label}${tool.description ? ` — ${tool.description}` : ''}${fav ? ' ★' : ''}\n우클릭: 즐겨찾기 토글`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '10px 4px 8px',
        background: hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', borderRadius: 10, cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${tool.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: tool.color, opacity: 0.9,
        }} />
        {fav && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            fontSize: 8, color: '#ffd60a', lineHeight: 1,
          }}>★</div>
        )}
      </div>
      <span style={{
        fontSize: 10, color: hover ? C.text : C.textSub,
        textAlign: 'center', lineHeight: 1.2,
        maxWidth: '100%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 0.1s',
      }}>
        {tool.label}
      </span>
    </button>
  )
})
