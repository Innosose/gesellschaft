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

function getArcParams(vw: number, vh: number, scale: number) {
  const radius = Math.min(vh * 0.66 * scale, 880)
  const arcCenterX = vw / 2
  const arcCenterY = vh / 2 + radius
  return { radius, arcCenterX, arcCenterY }
}

function cardPosition(angleDeg: number, radius: number, arcCenterX: number, arcCenterY: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: arcCenterX + radius * Math.sin(rad),
    y: arcCenterY - radius * Math.cos(rad),
  }
}

// ─── Single Fan Card ─────────────────────────────────────────────────────────
interface FanCardProps {
  tool: Tool
  angleDeg: number
  index: number
  total: number
  radius: number
  arcCenterX: number
  arcCenterY: number
  isRecommended: boolean
  isCenter: boolean
  animDuration: number
  staggerMs: number
  onSelect: () => void
}

const FanCard = memo(function FanCard({
  tool, angleDeg, index, total, radius, arcCenterX, arcCenterY,
  isRecommended, isCenter, animDuration, staggerMs, onSelect,
}: FanCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * staggerMs + 20)
    return () => clearTimeout(t)
  }, [index, staggerMs])

  const midIndex = (total - 1) / 2
  const distFromCenter = Math.abs(index - midIndex)
  const tNorm = midIndex > 0 ? distFromCenter / midIndex : 0

  // 지수 감소: 중앙=1.65, 가장자리≈0.46 — 9장 간격에서 겹치지 않는 비율
  const baseScale = 0.38 + 1.27 * Math.exp(-2.8 * tNorm)
  const activeScale = hovered ? baseScale * 1.07 : baseScale

  // 투명도
  const baseOpacity = Math.max(0.25, 1.0 - 0.75 * tNorm)

  // 중앙 ±1만 콘텐츠 표시
  const showContent = distFromCenter <= 1

  const { x, y } = cardPosition(angleDeg, radius, arcCenterX, arcCenterY)

  return (
    <div
      onClick={onSelect}
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
        cursor: 'pointer',
        borderRadius: 10,
        background: isCenter
          ? `linear-gradient(175deg, #2a2318, #1e1a10)`
          : `linear-gradient(175deg, #1e1a12, #151208)`,
        border: `2px solid ${tool.color + (isCenter ? 'dd' : hovered ? 'bb' : '44')}`,
        boxShadow: hovered
          ? `0 0 28px ${tool.color}77, 0 12px 36px rgba(0,0,0,0.8)`
          : isCenter
            ? `0 0 20px ${tool.color}55, 0 8px 24px rgba(0,0,0,0.7)`
            : `0 2px 10px rgba(0,0,0,0.5)`,
        transition: `left ${animDuration}ms cubic-bezier(0.22,1,0.36,1),
                     top ${animDuration}ms cubic-bezier(0.22,1,0.36,1),
                     transform ${animDuration * 0.65}ms cubic-bezier(0.22,1,0.36,1),
                     opacity ${animDuration * 0.5}ms ease`,
        opacity: mounted ? (hovered ? 1 : baseOpacity) : 0,
        zIndex: hovered ? 25 : isCenter ? 16 : 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        userSelect: 'none',
        overflow: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {/* Top color strip */}
      <div style={{
        background: `linear-gradient(90deg, ${tool.color}, ${tool.color}aa)`,
        height: isCenter ? 6 : 3,
        flexShrink: 0,
      }} />

      {showContent ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 8px 12px',
          position: 'relative',
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
            fontSize: isCenter ? 34 : 26,
            lineHeight: 1,
            filter: isCenter ? `drop-shadow(0 2px 8px ${tool.color}99)` : undefined,
          }}>
            {tool.icon}
          </span>
          <span style={{
            fontSize: isCenter ? 12 : 10.5,
            fontWeight: 700,
            color: isCenter ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)',
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'keep-all',
          }}>
            {tool.label}
          </span>
        </div>
      ) : (
        <div style={{
          flex: 1,
          background: `linear-gradient(175deg, ${tool.color}18, ${tool.color}06)`,
        }} />
      )}

      <div style={{
        height: 14,
        background: `linear-gradient(to top, ${tool.color}22, transparent)`,
        flexShrink: 0,
      }} />
    </div>
  )
})

// ─── Overview Grid ────────────────────────────────────────────────────────────
const OverviewGrid = memo(function OverviewGrid({
  tools, recommended, animDuration, onSelect, onClose,
}: {
  tools: Tool[]
  recommended: string[]
  animDuration: number
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease both',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(680px, 92vw)',
          maxHeight: '78vh',
          overflowY: 'auto',
          background: 'rgba(14,10,6,0.97)',
          backdropFilter: 'blur(28px)',
          borderRadius: 18,
          border: '1px solid rgba(210,148,50,0.22)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
          padding: '18px 16px 20px',
          animation: 'popIn 0.2s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,210,120,0.85)', letterSpacing: '0.04em' }}>
            전체 기능 ({tools.length})
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', fontSize: 16, padding: '2px 6px',
              borderRadius: 6, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)' }}
          >✕</button>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}>
          {tools.map(tool => (
            <OverviewCard
              key={tool.id}
              tool={tool}
              isRecommended={recommended.includes(tool.id)}
              animDuration={animDuration}
              onSelect={() => onSelect(tool.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

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
        gap: 5, padding: '10px 6px 9px',
        borderRadius: 10, cursor: 'pointer',
        background: hovered ? `linear-gradient(160deg, ${tool.color}28, ${tool.color}10)` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${hovered ? tool.color + 'bb' : isRecommended ? tool.color + '55' : 'rgba(255,255,255,0.09)'}`,
        boxShadow: hovered ? `0 0 18px ${tool.color}44` : 'none',
        transition: `all ${animDuration * 0.5}ms ease`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* top strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${tool.color}, ${tool.color}77)`,
      }} />
      <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{tool.icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
        color: hovered ? '#fff' : 'rgba(255,255,255,0.72)',
        wordBreak: 'keep-all',
      }}>
        {tool.label}
      </span>
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

// ─── Search Grid Card ─────────────────────────────────────────────────────────
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
        background: hovered ? `linear-gradient(135deg, ${tool.color}28, ${tool.color}12)` : `rgba(255,255,255,0.04)`,
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

// ─── Main SpiralMenu ──────────────────────────────────────────────────────────
export default function SpiralMenu({
  tools, recommended, spiralScale, animSpeed, filterQuery, onSelectTool,
}: SpiralMenuProps): React.ReactElement {
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const [centerIdx, setCenterIdx] = useState(0)
  const [showOverview, setShowOverview] = useState(false)
  const wheelCooldown = useRef(false)

  useEffect(() => {
    const onResize = (): void => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const animDuration = ANIM_MS[animSpeed] ?? 300
  const staggerMs = STAGGER_MS[animSpeed] ?? 22

  const { radius, arcCenterX, arcCenterY } = useMemo(
    () => getArcParams(vw, vh, spiralScale),
    [vw, vh, spiralScale],
  )

  const isSearching = filterQuery.length > 0

  const filteredTools = useMemo(() => {
    if (!filterQuery) return tools
    const q = filterQuery.toLowerCase()
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  }, [tools, filterQuery])

  // VISIBLE_COUNT개만 표시 (겹침 방지)
  const displayTools = useMemo(() => {
    if (isSearching) return filteredTools
    const N = tools.length
    const half = Math.floor(VISIBLE_COUNT / 2)
    return Array.from({ length: VISIBLE_COUNT }, (_, i) =>
      tools[(centerIdx - half + i + N) % N]
    )
  }, [tools, centerIdx, isSearching, filteredTools])

  const rotate = useCallback((dir: 1 | -1) => {
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

  const fanAngles = useMemo(() => {
    const N = displayTools.length
    if (N === 0) return []
    if (N === 1) return [0]
    const step = TOTAL_ARC_DEG / (N - 1)
    const start = -TOTAL_ARC_DEG / 2
    return displayTools.map((_, i) => start + i * step)
  }, [displayTools])

  const handleSelect = useCallback((id: string) => onSelectTool(id), [onSelectTool])
  const centerToolLabel = displayTools[Math.floor(displayTools.length / 2)]?.label ?? ''

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
          background: 'rgba(18,12,6,0.96)',
          backdropFilter: 'blur(24px)',
          borderRadius: 16,
          border: '1px solid rgba(210,148,50,0.2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 3,
          animation: 'fadeScaleIn 0.2s cubic-bezier(0.22,1,0.36,1) both',
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
      {displayTools.map((tool, i) => (
        <FanCard
          key={tool.id}
          tool={tool}
          angleDeg={fanAngles[i]}
          index={i}
          total={displayTools.length}
          radius={radius}
          arcCenterX={arcCenterX}
          arcCenterY={arcCenterY}
          isRecommended={recommended.includes(tool.id)}
          isCenter={i === Math.floor(displayTools.length / 2)}
          animDuration={animDuration}
          staggerMs={staggerMs}
          onSelect={() => handleSelect(tool.id)}
        />
      ))}

      {/* Rotation controls + overview button */}
      <div style={{
        position: 'fixed',
        bottom: 156,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',
        animation: 'fadeScaleIn 0.3s ease 0.2s both',
      }}>
        {/* 이전 */}
        <NavBtn onClick={() => rotate(-1)} label="‹" />

        {/* 현재 도구명 */}
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'rgba(255,210,120,0.85)',
          background: 'rgba(18,12,6,0.88)',
          border: '1px solid rgba(210,148,50,0.25)',
          borderRadius: 20,
          padding: '5px 16px',
          backdropFilter: 'blur(10px)',
          minWidth: 110, textAlign: 'center',
          letterSpacing: '0.02em',
        }}>
          {centerToolLabel}
        </div>

        {/* 다음 */}
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
            el.style.background = 'rgba(210,148,50,0.18)'
            el.style.borderColor = 'rgba(210,148,50,0.65)'
            el.style.color = '#ffd080'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(18,12,6,0.88)'
            el.style.borderColor = 'rgba(210,148,50,0.30)'
            el.style.color = 'rgba(255,200,100,0.65)'
          }}
        >⊞</button>
      </div>

      {/* Hint */}
      <div style={{
        position: 'fixed', bottom: 140, left: '50%', transform: 'translateX(-50%)',
        zIndex: 22, fontSize: 10, color: 'rgba(255,200,100,0.3)',
        pointerEvents: 'none', letterSpacing: '0.04em',
      }}>
        ← → 키 또는 스크롤로 회전
      </div>

      {/* Overview modal */}
      {showOverview && (
        <OverviewGrid
          tools={tools}
          recommended={recommended}
          animDuration={animDuration}
          onSelect={(id) => { setShowOverview(false); handleSelect(id) }}
          onClose={() => setShowOverview(false)}
        />
      )}

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </>
  )
}

// ─── 공통 NavBtn ──────────────────────────────────────────────────────────────
function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
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
        el.style.background = 'rgba(210,148,50,0.2)'
        el.style.borderColor = 'rgba(210,148,50,0.7)'
        el.style.color = '#ffd080'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = 'rgba(18,12,6,0.88)'
        el.style.borderColor = 'rgba(210,148,50,0.35)'
        el.style.color = 'rgba(255,200,100,0.8)'
      }}
    >
      {label}
    </button>
  )
}
