import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'

interface Tool {
  id: string
  icon: string
  label: string
  color: string
}

interface SpiralMenuProps {
  tools: Tool[]
  recommended: string[]
  spiralScale: number
  animSpeed: 'slow' | 'normal' | 'fast'
  filterQuery: string
  onSelectTool: (id: string) => void
}

const ANIM_MS: Record<string, number> = { slow: 540, normal: 300, fast: 140 }
const STAGGER_MS: Record<string, number> = { slow: 40, normal: 22, fast: 9 }
const CARD_W = 104
const CARD_H = 156
const TOTAL_ARC_DEG = 160
const VISIBLE_COUNT = 9
const RECENT_KEY = 'gesellschaft-recent-tools'
const MAX_RECENT = 5

// 카테고리 정의
const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: '업무·협업',  ids: ['ai', 'todo', 'clipboard', 'memoAlarm', 'docTemplate', 'translate', 'meetingTimer'] },
  { label: '날짜·재무',  ids: ['dateTools', 'salaryCalc', 'calculator'] },
  { label: '파일·문서',  ids: ['pdfTool', 'excelTool', 'imageTools'] },
  { label: '텍스트·변환', ids: ['textTools'] },
  { label: '파일 관리',  ids: ['fileManager', 'cadConvert'] },
]

function getRecentTools(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function addRecentTool(id: string): void {
  const prev = getRecentTools().filter(x => x !== id)
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)))
}

function getArcParams(vw: number, vh: number, scale: number) {
  const radius = Math.min(vh * 0.66 * scale, 880)
  const arcCenterX = vw / 2
  const arcCenterY = vh / 2 + radius
  return { radius, arcCenterX, arcCenterY }
}

function cardPosition(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) }
}

// ─── FanCard ──────────────────────────────────────────────────────────────────
interface FanCardProps {
  tool: Tool
  slotIndex: number       // 0~8, 슬롯 고정 → 회전 시 언마운트 없음
  total: number
  radius: number
  arcCenterX: number
  arcCenterY: number
  isRecommended: boolean
  isCenter: boolean
  animDuration: number
  staggerMs: number
  onSelect: () => void
  onRotateTo: (steps: number) => void
}

const FanCard = memo(function FanCard({
  tool, slotIndex, total, radius, arcCenterX, arcCenterY,
  isRecommended, isCenter, animDuration, staggerMs, onSelect, onRotateTo,
}: FanCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [contentFade, setContentFade] = useState(false)
  const prevId = useRef(tool.id)

  // 최초 마운트 페이드인 (스태거)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), slotIndex * staggerMs + 20)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 회전 시 콘텐츠 전환 (짧은 플래시)
  useEffect(() => {
    if (prevId.current !== tool.id) {
      prevId.current = tool.id
      setContentFade(true)
      const t = setTimeout(() => setContentFade(false), 90)
      return () => clearTimeout(t)
    }
  }, [tool.id])

  const midIndex = (total - 1) / 2
  const distFromCenter = Math.abs(slotIndex - midIndex)
  const tNorm = midIndex > 0 ? distFromCenter / midIndex : 0

  const baseScale = 0.38 + 1.27 * Math.exp(-2.8 * tNorm)
  const activeScale = hovered ? baseScale * 1.07 : baseScale
  const baseOpacity = Math.max(0.42, 1.0 - 0.58 * tNorm)
  const blurPx = tNorm * 4.5                               // 9. depth blur
  const showContent = true
  const stepsToCenter = slotIndex - Math.floor(total / 2)

  const angleDeg = (() => {
    if (total <= 1) return 0
    const step = TOTAL_ARC_DEG / (total - 1)
    return -TOTAL_ARC_DEG / 2 + slotIndex * step
  })()
  const { x, y } = cardPosition(angleDeg, radius, arcCenterX, arcCenterY)

  const handleClick = isCenter ? onSelect : () => onRotateTo(stepsToCenter)

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: x - CARD_W / 2,
        top: y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        transform: `scale(${activeScale})`,
        transformOrigin: 'center center',
        cursor: isCenter ? 'pointer' : stepsToCenter < 0 ? 'w-resize' : 'e-resize',
        borderRadius: 10,
        background: isCenter ? `linear-gradient(175deg, #2a2318, #1e1a10)` : `linear-gradient(175deg, #1e1a12, #151208)`,
        border: `2px solid ${tool.color + (isCenter ? 'dd' : hovered ? 'bb' : '44')}`,
        boxShadow: isCenter
          ? `0 0 20px ${tool.color}55, 0 8px 24px rgba(0,0,0,0.7)`
          : hovered
            ? `0 0 16px ${tool.color}55`
            : `0 2px 10px rgba(0,0,0,0.5)`,
        // 1. 중앙 카드 pulse: animation은 아래 style에서
        animation: isCenter ? 'centerPulse 2.8s ease-in-out infinite' : undefined,
        filter: blurPx > 0.1 ? `blur(${blurPx}px)` : undefined,  // 9. depth blur
        transition: `transform ${animDuration * 0.65}ms cubic-bezier(0.22,1,0.36,1),
                     opacity ${animDuration * 0.5}ms ease,
                     filter ${animDuration * 0.4}ms ease`,
        opacity: mounted ? (hovered ? 1 : baseOpacity) : 0,
        zIndex: hovered ? 25 : isCenter ? 16 : 12,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        userSelect: 'none', overflow: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {/* Top color strip */}
      <div style={{
        background: `linear-gradient(90deg, ${tool.color}, ${tool.color}aa)`,
        height: isCenter ? 6 : 3, flexShrink: 0,
      }} />

      {/* Content */}
      {showContent ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '10px 8px 12px', position: 'relative',
          opacity: contentFade ? 0.2 : 1,
          transition: `opacity ${contentFade ? 30 : 120}ms ease`,
        }}>
          {isRecommended && (
            <div style={{
              position: 'absolute', top: 8, right: 7,
              fontSize: 9, fontWeight: 700, color: '#fbbf24',
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 4, padding: '1px 5px',
            }}>AI</div>
          )}
          <span style={{
            fontSize: isCenter ? 32 : Math.max(16, 28 - distFromCenter * 3),
            lineHeight: 1,
            filter: isCenter ? `drop-shadow(0 2px 8px ${tool.color}99)` : undefined,
          }}>{tool.icon}</span>
          <span style={{
            fontSize: isCenter ? 12 : Math.max(9, 11 - distFromCenter * 0.5),
            fontWeight: 700,
            color: isCenter ? 'rgba(255,255,255,0.95)' : `rgba(255,255,255,${Math.max(0.5, 0.85 - distFromCenter * 0.1)})`,
            textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all',
          }}>{tool.label}</span>
        </div>
      ) : (
        // 3. 비중앙 hover: 회전 방향 화살표
        <div style={{
          flex: 1,
          background: `linear-gradient(175deg, ${tool.color}18, ${tool.color}06)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {hovered && (
            <span style={{
              fontSize: 22, color: `${tool.color}cc`,
              animation: 'arrowPulse 0.6s ease-in-out infinite alternate',
            }}>
              {stepsToCenter < 0 ? '‹' : '›'}
            </span>
          )}
        </div>
      )}

      <div style={{
        height: 14, flexShrink: 0,
        background: `linear-gradient(to top, ${tool.color}22, transparent)`,
      }} />
    </div>
  )
})

// ─── Overview Grid ────────────────────────────────────────────────────────────
const OverviewGrid = memo(function OverviewGrid({
  tools, recommended, recentIds, animDuration, onSelect, onClose,
}: {
  tools: Tool[]
  recommended: string[]
  recentIds: string[]
  animDuration: number
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const toolMap = useMemo(() => new Map(tools.map(t => [t.id, t])), [tools])
  const recentTools = recentIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[]

  // 카테고리별로 도구를 분류
  const categorized = useMemo(() => {
    const placed = new Set<string>()
    const groups: { label: string; tools: Tool[] }[] = []
    for (const cat of CATEGORIES) {
      const catTools = cat.ids.map(id => toolMap.get(id)).filter(Boolean) as Tool[]
      if (catTools.length) { groups.push({ label: cat.label, tools: catTools }); catTools.forEach(t => placed.add(t.id)) }
    }
    const rest = tools.filter(t => !placed.has(t.id))
    if (rest.length) groups.push({ label: '기타', tools: rest })
    return groups
  }, [tools, toolMap])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease both',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(700px, 94vw)', maxHeight: '80vh', overflowY: 'auto',
          background: 'rgba(14,10,6,0.97)', backdropFilter: 'blur(28px)',
          borderRadius: 18, border: '1px solid rgba(210,148,50,0.22)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
          padding: '18px 16px 22px',
          animation: 'popIn 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.14)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,210,120,0.85)', letterSpacing: '0.04em' }}>
            전체 기능 ({tools.length})
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: 16, padding: '2px 6px', borderRadius: 6,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)' }}
          >✕</button>
        </div>

        {/* 7. 최근 사용 */}
        {recentTools.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <SectionLabel label="최근 사용" />
            <OverviewRow tools={recentTools} recommended={recommended} animDuration={animDuration} onSelect={onSelect} />
          </div>
        )}

        {/* 6. 카테고리 그룹 */}
        {categorized.map(group => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            <SectionLabel label={group.label} />
            <OverviewRow tools={group.tools} recommended={recommended} animDuration={animDuration} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  )
})

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      color: 'rgba(210,148,50,0.55)', marginBottom: 7,
      textTransform: 'uppercase',
    }}>{label}</div>
  )
}

function OverviewRow({ tools, recommended, animDuration, onSelect }: {
  tools: Tool[]; recommended: string[]; animDuration: number; onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
      {tools.map(t => (
        <OverviewCard key={t.id} tool={t} isRecommended={recommended.includes(t.id)}
          animDuration={animDuration} onSelect={() => onSelect(t.id)} />
      ))}
    </div>
  )
}

const OverviewCard = memo(function OverviewCard({
  tool, isRecommended, animDuration, onSelect,
}: { tool: Tool; isRecommended: boolean; animDuration: number; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 5, padding: '10px 6px 9px', borderRadius: 10, cursor: 'pointer',
        background: hovered ? `linear-gradient(160deg, ${tool.color}28, ${tool.color}10)` : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${hovered ? tool.color + 'bb' : isRecommended ? tool.color + '55' : 'rgba(255,255,255,0.18)'}`,
        boxShadow: hovered ? `0 0 18px ${tool.color}44` : 'none',
        transition: `all ${animDuration * 0.5}ms ease`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${tool.color}, ${tool.color}77)`,
      }} />
      <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{tool.icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
        color: hovered ? '#fff' : 'rgba(255,255,255,0.72)', wordBreak: 'keep-all',
      }}>{tool.label}</span>
      {isRecommended && (
        <div style={{
          position: 'absolute', top: 6, right: 5,
          fontSize: 8, fontWeight: 700, color: '#fbbf24',
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: 3, padding: '0px 3px',
        }}>AI</div>
      )}
    </button>
  )
})

// ─── Search Grid ──────────────────────────────────────────────────────────────
const GridCard = memo(function GridCard({
  tool, isRecommended, animDuration, onSelect,
}: { tool: Tool; isRecommended: boolean; animDuration: number; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        background: hovered ? `linear-gradient(135deg, ${tool.color}28, ${tool.color}12)` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? tool.color + '99' : isRecommended ? tool.color + '55' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: hovered ? `0 0 20px ${tool.color}33` : undefined,
        transition: `all ${animDuration * 0.6}ms ease`,
        textAlign: 'left', width: '100%', color: 'inherit',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{tool.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: hovered ? '#fff' : 'rgba(255,255,255,0.82)' }}>
        {tool.label}
      </span>
      {isRecommended && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#fbbf24', fontWeight: 600 }}>AI ✦</span>
      )}
    </button>
  )
})

// ─── NavBtn ───────────────────────────────────────────────────────────────────
function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      width: 34, height: 34, borderRadius: '50%',
      border: '1px solid rgba(210,148,50,0.35)',
      background: 'rgba(18,12,6,0.88)',
      color: 'rgba(255,200,100,0.8)',
      fontSize: 18, cursor: 'pointer',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.15s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLButtonElement
      el.style.background = 'rgba(210,148,50,0.2)'; el.style.borderColor = 'rgba(210,148,50,0.7)'; el.style.color = '#ffd080'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLButtonElement
      el.style.background = 'rgba(18,12,6,0.88)'; el.style.borderColor = 'rgba(210,148,50,0.35)'; el.style.color = 'rgba(255,200,100,0.8)'
    }}
    >{label}</button>
  )
}

// ─── Main SpiralMenu ──────────────────────────────────────────────────────────
export default function SpiralMenu({
  tools, recommended, spiralScale, animSpeed, filterQuery, onSelectTool,
}: SpiralMenuProps): React.ReactElement {
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const [centerIdx, setCenterIdx] = useState(() => {
    const recent = getRecentTools()
    if (recent.length === 0) return 0
    const idx = tools.findIndex(t => t.id === recent[0])
    return idx >= 0 ? idx : 0
  })
  const [showOverview, setShowOverview] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>(getRecentTools)
  const wheelCooldown = useRef(false)

  useEffect(() => {
    const onResize = (): void => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const animDuration = ANIM_MS[animSpeed] ?? 300
  const staggerMs = STAGGER_MS[animSpeed] ?? 22
  const { radius, arcCenterX, arcCenterY } = useMemo(() => getArcParams(vw, vh, spiralScale), [vw, vh, spiralScale])
  const isSearching = filterQuery.length > 0

  const filteredTools = useMemo(() => {
    if (!filterQuery) return tools
    const q = filterQuery.toLowerCase()
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  }, [tools, filterQuery])

  // 슬롯 기반: slotIndex(0~8)를 key로, tool을 prop으로 → 회전 시 언마운트 없음
  const slotTools = useMemo(() => {
    if (isSearching) return filteredTools
    const N = tools.length
    const half = Math.floor(VISIBLE_COUNT / 2)
    return Array.from({ length: VISIBLE_COUNT }, (_, i) =>
      tools[(centerIdx - half + i + N) % N]
    )
  }, [tools, centerIdx, isSearching, filteredTools])

  const rotate = useCallback((dir: number) => {
    setCenterIdx(i => (i + dir + tools.length) % tools.length)
  }, [tools.length])

  useEffect(() => {
    if (isSearching || showOverview) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') rotate(-1)
      else if (e.key === 'ArrowRight') rotate(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rotate, isSearching, showOverview])

  useEffect(() => {
    if (isSearching || showOverview) return
    const handler = (e: WheelEvent): void => {
      if (wheelCooldown.current) return
      wheelCooldown.current = true
      rotate(e.deltaY > 0 ? 1 : -1)
      setTimeout(() => { wheelCooldown.current = false }, 120)
    }
    window.addEventListener('wheel', handler, { passive: true })
    return () => window.removeEventListener('wheel', handler)
  }, [rotate, isSearching, showOverview])

  const handleSelect = useCallback((id: string) => {
    addRecentTool(id)
    setRecentIds(getRecentTools())
    onSelectTool(id)
  }, [onSelectTool])

  const centerToolLabel = slotTools[Math.floor(slotTools.length / 2)]?.label ?? ''

  // ── Search mode ───────────────────────────────────────────────────────────
  if (isSearching) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 15, pointerEvents: 'none',
      }}>
        <div style={{
          pointerEvents: 'auto',
          width: 460, maxHeight: '60vh', overflowY: 'auto',
          background: 'rgba(18,12,6,0.96)', backdropFilter: 'blur(24px)',
          borderRadius: 16, border: '1px solid rgba(210,148,50,0.2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 3,
          animation: 'fadeIn 0.15s ease both',
        }}>
          {filteredTools.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              검색 결과가 없습니다
            </div>
          ) : filteredTools.map(t => (
            <GridCard key={t.id} tool={t} isRecommended={recommended.includes(t.id)}
              animDuration={animDuration} onSelect={() => handleSelect(t.id)} />
          ))}
        </div>
      </div>
    )
  }

  // ── Fan mode ──────────────────────────────────────────────────────────────
  return (
    <>
      {slotTools.map((tool, i) => (
        <FanCard
          key={i}                          // 슬롯 고정 key → 회전 시 언마운트 없음
          tool={tool}
          slotIndex={i}
          total={slotTools.length}
          radius={radius}
          arcCenterX={arcCenterX}
          arcCenterY={arcCenterY}
          isRecommended={recommended.includes(tool.id)}
          isCenter={i === Math.floor(slotTools.length / 2)}
          animDuration={animDuration}
          staggerMs={staggerMs}
          onSelect={() => handleSelect(tool.id)}
          onRotateTo={(steps) => rotate(steps)}
        />
      ))}

      {/* 4/5. 회전 컨트롤 (힌트 통합) */}
      <div style={{
        position: 'fixed', bottom: 148, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'auto',
        animation: 'slideUpFade 0.3s ease 0.2s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NavBtn onClick={() => rotate(-1)} label="‹" />
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,210,120,0.85)',
            background: 'rgba(18,12,6,0.88)', border: '1px solid rgba(210,148,50,0.25)',
            borderRadius: 20, padding: '5px 16px', backdropFilter: 'blur(10px)',
            minWidth: 110, textAlign: 'center', letterSpacing: '0.02em',
          }}>
            {centerToolLabel}
          </div>
          <NavBtn onClick={() => rotate(1)} label="›" />

          {/* 한눈에 보기 */}
          <button
            onClick={() => setShowOverview(true)}
            title="전체 기능 보기"
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid rgba(210,148,50,0.30)',
              background: 'rgba(18,12,6,0.88)',
              color: 'rgba(255,200,100,0.65)',
              fontSize: 16, cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: 4,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(210,148,50,0.18)'; el.style.borderColor = 'rgba(210,148,50,0.65)'; el.style.color = '#ffd080'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(18,12,6,0.88)'; el.style.borderColor = 'rgba(210,148,50,0.30)'; el.style.color = 'rgba(255,200,100,0.65)'
            }}
          >⊞</button>
        </div>

        {/* 힌트: 컨트롤 바로 아래 통합 */}
        <div style={{
          fontSize: 10, color: 'rgba(255,200,100,0.55)',
          letterSpacing: '0.04em', pointerEvents: 'none',
        }}>
          ← → 키 · 스크롤 · 클릭으로 회전
        </div>
      </div>

      {/* Overview modal */}
      {showOverview && (
        <OverviewGrid
          tools={tools}
          recommended={recommended}
          recentIds={recentIds}
          animDuration={animDuration}
          onSelect={(id) => { setShowOverview(false); handleSelect(id) }}
          onClose={() => setShowOverview(false)}
        />
      )}

      <style>{`
        @keyframes centerPulse {
          0%, 100% { box-shadow: 0 0 20px var(--tool-color, #fff4) , 0 8px 24px rgba(0,0,0,0.7); }
          50%       { box-shadow: 0 0 36px var(--tool-color, #fff6), 0 8px 32px rgba(0,0,0,0.6); }
        }
        @keyframes arrowPulse {
          from { opacity: 0.5; transform: scale(0.9); }
          to   { opacity: 1.0; transform: scale(1.1); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  )
}
