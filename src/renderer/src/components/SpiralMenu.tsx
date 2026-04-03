import React, { useState, useMemo, useCallback, memo, lazy, Suspense } from 'react'
import { T, rgba } from '../utils/theme'

// ═══════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════

interface Tool { id: string; icon: string; label: string; color: string; description?: string }
interface SpiralMenuProps {
  tools: Tool[]
  spiralScale: number; animSpeed: 'slow' | 'normal' | 'fast' | 'none'
  filterQuery?: string; onSelectTool: (id: string) => void
  onClose?: () => void
}

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: 'Core',       ids: ['ai','clipboard','jot','haste'] },
  { label: 'Overlay',    ids: ['notepin','whiteboard','ruler','xcolor','zone'] },
  { label: 'Quick Use',  ids: ['quickCalc','generator','type','upload','keyboard'] },
  { label: 'Schedule',   ids: ['memoAlarm','organizer','stopwatch','launcher'] },
  { label: 'Documents',  ids: ['pdfTool','excelTool','imageTools','diff','batch','finder'] },
  { label: 'System',     ids: ['vault','yourInfo'] },
]

const IS_WEB = !('__electron__' in window || navigator.userAgent.includes('Electron'))
const WEB_DISABLED_TOOLS = new Set([
  'finder', 'excelTool', 'pdfTool', 'imageTools', 'launcher',
  'clipboard', 'zone', 'notepin', 'batch', 'upload', 'xcolor', 'yourInfo', 'keyboard',
])
function isToolDisabled(id: string): boolean { return IS_WEB && WEB_DISABLED_TOOLS.has(id) }

const RECENT_KEY = 'gesellschaft-recent-tools'
const MAX_RECENT = 5
function getRecentTools(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] } }
function addRecentTool(id: string): void { const p = getRecentTools().filter(x => x !== id); localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...p].slice(0, MAX_RECENT))) }

const FAV_KEY = 'gs-favorites'
function getFavorites(): string[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') } catch { return [] } }
function toggleFavorite(id: string): string[] { const f = getFavorites(); const next = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; localStorage.setItem(FAV_KEY, JSON.stringify(next)); return next }

const ANIM_MS: Record<string, number> = { slow: 600, normal: 350, fast: 180, none: 0 }

// ═══════════════════════════════════════════════
// OverviewGrid — Full-screen iOS card list
// ═══════════════════════════════════════════════

const LazySettings = lazy(() => import('./SettingsPanel'))

const OverviewGrid = memo(function OverviewGrid({ tools, recentIds, favoriteIds, animDuration, onSelect, onClose, onToggleFav }: {
  tools: Tool[]; recentIds: string[]
  favoriteIds: string[]; animDuration: number; onSelect: (id: string) => void; onClose: () => void
  onToggleFav: (id: string) => void
}) {
  const [ovSearch, setOvSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const toolMap = useMemo(() => new Map(tools.map(t => [t.id, t])), [tools])
  const recentTools = useMemo(() => recentIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[], [recentIds, toolMap])
  const favTools = useMemo(() => favoriteIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[], [favoriteIds, toolMap])
  const categorized = useMemo(() => {
    const placed = new Set<string>(); const groups: { label: string; tools: Tool[] }[] = []
    for (const cat of CATEGORIES) { const ct = cat.ids.map(id => toolMap.get(id)).filter(Boolean) as Tool[]; if (ct.length) { groups.push({ label: cat.label, tools: ct }); ct.forEach(t => placed.add(t.id)) } }
    const rest = tools.filter(t => !placed.has(t.id)); if (rest.length) groups.push({ label: '기타', tools: rest }); return groups
  }, [tools, toolMap])

  const q = ovSearch.toLowerCase()
  const isFiltering = q.length > 0
  const filteredAll = useMemo(() => {
    if (!q) return null
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
  }, [tools, q])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, animation: 'fadeIn 0.15s ease both' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#000', animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 20px 0', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
              {showSettings ? '설정' : `${tools.length}개 기능`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowSettings(s => !s)} title={showSettings ? '도구 목록' : '설정'} style={{
                background: showSettings ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
                border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                width: 30, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44,
              }}>
                {showSettings ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="5" height="5" rx="1.5"/><rect x="9" y="2" width="5" height="5" rx="1.5"/><rect x="2" y="9" width="5" height="5" rx="1.5"/><rect x="9" y="9" width="5" height="5" rx="1.5"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"/>
                  </svg>
                )}
              </button>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer', width: 30, height: 30, borderRadius: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>
              </button>
            </div>
          </div>
          {/* Search bar — only in tool list mode */}
          {!showSettings && (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3, pointerEvents: 'none' }}>
                <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={ovSearch} onChange={e => setOvSearch(e.target.value)} placeholder="검색" style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.92)',
                fontSize: 15, outline: 'none', minHeight: 36, letterSpacing: '-0.41px', lineHeight: '1.33',
              }} />
              {ovSearch && (
                <button onClick={() => setOvSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.12)', border: 'none', color: 'rgba(255,255,255,0.40)',
                  cursor: 'pointer', fontSize: 9, lineHeight: 1, padding: 0,
                  width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {showSettings ? (
          <Suspense fallback={null}><LazySettings /></Suspense>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
            {isFiltering ? (
              filteredAll && filteredAll.length > 0
                ? <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>{filteredAll.map((t, i) => <ToolRow key={t.id} tool={t} fav={favoriteIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} last={i === filteredAll.length - 1} />)}</div>
                : <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: 15 }}>결과 없음</div>
            ) : (
              <>
                {favTools.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel text="즐겨찾기" />
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      {favTools.map((t, i) => <ToolRow key={t.id} tool={t} fav onSelect={onSelect} onToggleFav={onToggleFav} last={i === favTools.length - 1} />)}
                    </div>
                  </div>
                )}
                {recentTools.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel text="최근" />
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      {recentTools.map((t, i) => <ToolRow key={t.id} tool={t} fav={favoriteIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} last={i === recentTools.length - 1} />)}
                    </div>
                  </div>
                )}
                {categorized.map(g => (
                  <div key={g.label} style={{ marginBottom: 20 }}>
                    <SectionLabel text={g.label} />
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      {g.tools.map((t, i) => <ToolRow key={t.id} tool={t} fav={favoriteIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} last={i === g.tools.length - 1} />)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

const SectionLabel = memo(function SectionLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginBottom: 6, paddingLeft: 16, lineHeight: 1.4, textTransform: 'uppercase' as const }}>{text}</div>
})

const ToolRow = memo(function ToolRow({ tool, fav, onSelect, onToggleFav, last }: {
  tool: Tool; fav?: boolean; onSelect: (id: string) => void; onToggleFav?: (id: string) => void; last?: boolean
}) {
  const disabled = isToolDisabled(tool.id)
  const [h, setH] = useState(false)
  return (
    <button onClick={disabled ? undefined : () => onSelect(tool.id)}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={disabled ? '데스크톱 전용 기능' : tool.description}
      aria-label={tool.label} aria-disabled={disabled || undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: !disabled && h ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none', width: '100%', textAlign: 'left',
        minHeight: 44, opacity: disabled ? 0.35 : 1,
        transition: 'background 0.15s',
      }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${tool.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tool.color, opacity: disabled ? 0.3 : 0.8 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.06)', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 400, color: disabled ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1.3, letterSpacing: '-0.41px' }}>{tool.label}</span>
        {disabled && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.20)', flexShrink: 0 }}>데스크톱</span>}
        {!disabled && fav && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}>★</span>}
        {!disabled && onToggleFav && h && !fav && <span onClick={e => { e.stopPropagation(); onToggleFav(tool.id) }} style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0 }} title="즐겨찾기 추가">☆</span>}
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: disabled ? 0.08 : 0.15 }}>
          <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.40)' }} />
        </svg>
      </div>
    </button>
  )
})

// ═══════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════

export default function SpiralMenu({ tools, animSpeed, onSelectTool, onClose }: SpiralMenuProps): React.ReactElement {
  const [recentIds, setRecentIds] = useState<string[]>(getRecentTools)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavorites)
  const animDuration = ANIM_MS[animSpeed] ?? 300

  const handleSelect = useCallback((id: string) => { if (isToolDisabled(id)) return; addRecentTool(id); setRecentIds(getRecentTools()); onSelectTool(id) }, [onSelectTool])
  const handleToggleFav = useCallback((id: string) => { setFavoriteIds(toggleFavorite(id)) }, [])

  return (
    <>
      <OverviewGrid tools={tools} recentIds={recentIds}
        favoriteIds={favoriteIds} animDuration={animDuration} onSelect={handleSelect}
        onClose={onClose ?? (() => {})} onToggleFav={handleToggleFav} />
      <style>{`@keyframes sheetUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  )
}
