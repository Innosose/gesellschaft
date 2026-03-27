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
const CARD_W  = 108   // px
const CARD_H  = 152   // px
const TOTAL_ARC_DEG = 148  // total spread in degrees (left edge to right edge)

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
  const featureScale = isCenterCard ? 1.06 : 1 - distFromCenter * 0.012

  // Hover: extend outward along the radius
  const hoverRadius = hovered ? radius + 30 : radius
  const { x, y } = cardPosition(angleDeg, hoverRadius, arcCenterX, arcCenterY)

  // Cards farther from center are slightly dimmer
  const dimFactor = Math.max(0.55, 1 - distFromCenter * 0.04)

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
        transform: `rotate(${angleDeg}deg) scale(${hovered ? featureScale * 1.08 : featureScale})`,
        transformOrigin: 'center center',
        cursor: 'pointer',
        borderRadius: 12,
        background: hovered
          ? `linear-gradient(160deg, ${tool.color}30, ${tool.color}14)`
          : `linear-gradient(170deg, ${tool.color}22, ${tool.color}08)`,
        border: `1.5px solid ${hovered ? tool.color + 'cc' : tool.color + (isCenterCard ? '66' : '3a')}`,
        boxShadow: hovered
          ? `0 0 32px ${tool.color}55, 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 ${tool.color}33`
          : isRecommended
            ? `0 0 18px ${tool.color}77, 0 4px 20px rgba(0,0,0,0.4)`
            : isCenterCard
              ? `0 0 14px ${tool.color}33, 0 6px 24px rgba(0,0,0,0.45)`
              : `0 4px 18px rgba(0,0,0,0.35)`,
        backdropFilter: hovered ? 'blur(6px)' : undefined,
        transition: `all ${animDuration * 0.8}ms cubic-bezier(0.22,1,0.36,1)`,
        opacity: mounted ? dimFactor : 0,
        zIndex: hovered ? 30 : isCenterCard ? 5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Recommended indicator */}
      {isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#fbbf24',
            boxShadow: '0 0 8px #fbbf24aa',
          }}
        />
      )}

      {/* Color accent bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: hovered
            ? `linear-gradient(90deg, ${tool.color}aa, ${tool.color}55)`
            : `linear-gradient(90deg, ${tool.color}66, ${tool.color}22)`,
          borderRadius: '12px 12px 0 0',
          transition: `background ${animDuration * 0.6}ms ease`,
        }}
      />

      {/* Card content — counter-rotated so text is always upright */}
      <div
        style={{
          transform: `rotate(${-angleDeg}deg)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '0 8px',
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize: hovered ? 34 : 30,
            lineHeight: 1,
            transition: `font-size ${animDuration * 0.5}ms ease`,
            filter: hovered ? `drop-shadow(0 0 8px ${tool.color}88)` : undefined,
          }}
        >
          {tool.icon}
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: hovered || isCenterCard ? 700 : 500,
            color: hovered ? '#fff' : `rgba(255,255,255,${isCenterCard ? 0.85 : 0.68})`,
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'keep-all',
            transition: `color ${animDuration * 0.5}ms ease`,
          }}
        >
          {tool.label}
        </span>
      </div>
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
