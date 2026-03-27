import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'

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

// ─── Fan geometry ──────────────────────────────────────────────────────────────
// Arc center is off-screen below the viewport.
// Cards are placed along the arc and rotated to face outward from the center.
const CARD_W  = 104   // px
const CARD_H  = 156   // px  — tall like a book spine
const TOTAL_ARC_DEG = 150  // total spread in degrees (left edge to right edge)

function getArcParams(vw: number, vh: number, scale: number) {
  const radius    = Math.min(vh * 0.62 * scale, 820)
  const arcCenterX = vw / 2
  const arcCenterY = vh + 210  // below the screen
  return { radius, arcCenterX, arcCenterY }
}

function cardPosition(
  angleDeg: number,
  radius: number,
  arcCenterX: number,
  arcCenterY: number,
) {
  const rad = (angleDeg * Math.PI) / 180
  const x = arcCenterX + radius * Math.sin(rad)
  const y = arcCenterY - radius * Math.cos(rad)
  return { x, y }
}

// ─── Single Fan Card ────────────────────────────────────────────────────────────
interface FanCardProps {
  tool: Tool
  angleDeg: number
  index: number
  total: number
  radius: number
  arcCenterX: number
  arcCenterY: number
  isRecommended: boolean
  animDuration: number
  staggerMs: number
  onSelect: () => void
}

const FanCard = memo(function FanCard({
  tool,
  angleDeg,
  index,
  total,
  radius,
  arcCenterX,
  arcCenterY,
  isRecommended,
  animDuration,
  staggerMs,
  onSelect,
}: FanCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * staggerMs + 40)
    return () => clearTimeout(t)
  }, [index, staggerMs])

  // Center card (index near middle) is the "feature" card
  const midIndex = (total - 1) / 2
  const distFromCenter = Math.abs(index - midIndex)
  const isCenterCard = distFromCenter < 1.5
  // Edge cards scale down slightly for depth
  const baseScale = Math.max(0.82, 1 - distFromCenter * 0.018)
  const activeScale = hovered ? baseScale * 1.1 : baseScale

  // Hover: extend outward along the radius
  const hoverRadius = hovered ? radius + 34 : radius
  const { x, y } = cardPosition(angleDeg, hoverRadius, arcCenterX, arcCenterY)

  // Derive a solid background from tool color
  // Mix tool.color with very dark mahogany
  const solidBg = tool.color

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
        transform: `rotate(${angleDeg}deg) scale(${activeScale})`,
        transformOrigin: 'center center',
        cursor: 'pointer',
        borderRadius: 10,
        // Fully opaque dark card with tool-color tinted background
        background: hovered
          ? `linear-gradient(175deg, #2a2218, #1e1810)`
          : isCenterCard
            ? `linear-gradient(175deg, #242018, #1a1610)`
            : `linear-gradient(175deg, #1e1a12, #151208)`,
        border: `2px solid ${hovered ? solidBg + 'ff' : solidBg + (isCenterCard ? 'cc' : '66')}`,
        boxShadow: hovered
          ? `0 0 28px ${solidBg}88, 0 16px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isRecommended
            ? `0 0 16px ${solidBg}66, 0 6px 20px rgba(0,0,0,0.6)`
            : isCenterCard
              ? `0 0 10px ${solidBg}44, 0 8px 24px rgba(0,0,0,0.6)`
              : `0 4px 14px rgba(0,0,0,0.55)`,
        transition: `all ${animDuration * 0.75}ms cubic-bezier(0.22,1,0.36,1)`,
        opacity: mounted ? 1 : 0,
        zIndex: hovered ? 30 : isCenterCard ? 5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Solid color header strip — like a book cover label */}
      <div
        style={{
          background: hovered
            ? solidBg
            : `linear-gradient(90deg, ${solidBg}ee, ${solidBg}99)`,
          height: 5,
          flexShrink: 0,
          transition: `background ${animDuration * 0.5}ms ease`,
        }}
      />

      {/* Card body — counter-rotated so text is always upright */}
      <div
        style={{
          flex: 1,
          transform: `rotate(${-angleDeg}deg)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 8px 12px',
        }}
      >
        {/* AI recommended badge */}
        {isRecommended && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 8,
              fontSize: 9,
              fontWeight: 700,
              color: '#fbbf24',
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 4,
              padding: '1px 5px',
              letterSpacing: '0.04em',
            }}
          >
            AI
          </div>
        )}

        <span
          style={{
            fontSize: hovered || isCenterCard ? 34 : 28,
            lineHeight: 1,
            transition: `font-size ${animDuration * 0.4}ms ease`,
            filter: hovered ? `drop-shadow(0 2px 6px ${solidBg}99)` : undefined,
          }}
        >
          {tool.icon}
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: isCenterCard || hovered ? 700 : 600,
            color: hovered ? '#ffffff' : isCenterCard ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'keep-all',
            transition: `color ${animDuration * 0.4}ms ease`,
          }}
        >
          {tool.label}
        </span>
      </div>

      {/* Bottom color tint */}
      <div
        style={{
          height: 20,
          background: `linear-gradient(to top, ${solidBg}18, transparent)`,
          flexShrink: 0,
        }}
      />
    </div>
  )
})

// ─── Grid Card (filter mode) ────────────────────────────────────────────────────
const GridCard = memo(function GridCard({
  tool,
  isRecommended,
  animDuration,
  onSelect,
}: {
  tool: Tool
  isRecommended: boolean
  animDuration: number
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        background: hovered
          ? `linear-gradient(135deg, ${tool.color}28, ${tool.color}12)`
          : `rgba(255,255,255,0.04)`,
        border: `1px solid ${hovered ? tool.color + '99' : isRecommended ? tool.color + '55' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: hovered ? `0 0 20px ${tool.color}33` : undefined,
        transition: `all ${animDuration * 0.6}ms ease`,
        textAlign: 'left',
        width: '100%',
        color: 'inherit',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{tool.icon}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: hovered ? '#fff' : 'rgba(255,255,255,0.82)',
        }}
      >
        {tool.label}
      </span>
      {isRecommended && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#fbbf24', fontWeight: 600 }}>
          AI ✦
        </span>
      )}
    </button>
  )
})

// ─── Main SpiralMenu ────────────────────────────────────────────────────────────
export default function SpiralMenu({
  tools,
  recommended,
  spiralScale,
  animSpeed,
  filterQuery,
  onSelectTool,
}: SpiralMenuProps): React.ReactElement {
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)

  useEffect(() => {
    const onResize = (): void => {
      setVw(window.innerWidth)
      setVh(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const animDuration = ANIM_MS[animSpeed] ?? 300
  const staggerMs    = STAGGER_MS[animSpeed] ?? 22

  const { radius, arcCenterX, arcCenterY } = useMemo(
    () => getArcParams(vw, vh, spiralScale),
    [vw, vh, spiralScale],
  )

  const filteredTools = useMemo(() => {
    if (!filterQuery) return tools
    const q = filterQuery.toLowerCase()
    return tools.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q),
    )
  }, [tools, filterQuery])

  const isSearching = filterQuery.length > 0

  // Fan positions for full list
  const fanAngles = useMemo(() => {
    const N = filteredTools.length
    if (N === 0) return []
    if (N === 1) return [0]
    const step = TOTAL_ARC_DEG / (N - 1)
    const start = -TOTAL_ARC_DEG / 2
    return filteredTools.map((_, i) => start + i * step)
  }, [filteredTools])

  const handleSelect = useCallback(
    (id: string) => onSelectTool(id),
    [onSelectTool],
  )

  // ── Filter mode: floating grid ──────────────────────────────────────────────
  if (isSearching) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: 460,
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'rgba(8,5,20,0.88)',
            backdropFilter: 'blur(24px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeScaleIn 0.2s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {filteredTools.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 13,
              }}
            >
              검색 결과가 없습니다
            </div>
          ) : (
            filteredTools.map(t => (
              <GridCard
                key={t.id}
                tool={t}
                isRecommended={recommended.includes(t.id)}
                animDuration={animDuration}
                onSelect={() => handleSelect(t.id)}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  // ── Fan mode ────────────────────────────────────────────────────────────────
  return (
    <>
      {filteredTools.map((tool, i) => (
        <FanCard
          key={tool.id}
          tool={tool}
          angleDeg={fanAngles[i]}
          index={i}
          total={filteredTools.length}
          radius={radius}
          arcCenterX={arcCenterX}
          arcCenterY={arcCenterY}
          isRecommended={recommended.includes(tool.id)}
          animDuration={animDuration}
          staggerMs={staggerMs}
          onSelect={() => handleSelect(tool.id)}
        />
      ))}

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
