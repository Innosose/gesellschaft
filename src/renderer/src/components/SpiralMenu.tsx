import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { rgba } from '../utils/color'

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

const ANIM_DURATION: Record<string, number> = { slow: 520, normal: 300, fast: 140 }
const STAGGER: Record<string, number>       = { slow: 44,  normal: 26,  fast: 11  }

const BRICK_ROWS: number[] = [5, 4, 5, 4, 5]
const BASE_W   = 122
const BASE_H   = 165
const BASE_GAP = 12

function buildPositions(count: number, w: number, h: number, gap: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const stride = w + gap
  let idx = 0
  for (let r = 0; r < BRICK_ROWS.length; r++) {
    const cols  = BRICK_ROWS[r]
    const rowY  = r * (h + gap)
    const rowW  = cols * stride - gap
    const fullW = 5 * stride - gap
    const offX  = (fullW - rowW) / 2
    for (let c = 0; c < cols && idx < count; c++) {
      positions.push({ x: offX + c * stride, y: rowY })
      idx++
    }
  }
  return positions
}

// ── Memoized card ─────────────────────────────────────────────────────────────
interface ToolCardProps {
  tool: Tool
  pos: { x: number; y: number }
  cardW: number
  cardH: number
  dur: number
  stagger: number
  index: number
  spiralScale: number
  isHovered: boolean
  isRec: boolean
  dimmed: boolean
  highlighted: boolean
  mounted: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

const ToolCard = memo(function ToolCard({
  tool, pos, cardW, cardH, dur, stagger, index, spiralScale,
  isHovered, isRec, dimmed, highlighted, mounted,
  onHover, onSelect,
}: ToolCardProps): React.ReactElement {
  const delay = index * stagger

  const entryY     = mounted ? 0 : 24
  const entryScale = mounted ? 1 : 0.72
  const opacity    = mounted ? (dimmed ? 0.07 : 1) : 0
  const hoverY     = isHovered ? -10 : 0
  const hoverRot   = isHovered ? (index % 2 === 0 ? 1.0 : -1.0) : 0
  const scale      = dimmed ? 0.93 : isHovered ? 1.04 : 1

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x, top: pos.y,
        width: cardW, height: cardH,
        opacity,
        willChange: 'transform, opacity',
        transform: mounted
          ? `translateY(${hoverY}px) rotate(${hoverRot}deg) scale(${scale})`
          : `translateY(${entryY}px) scale(${entryScale})`,
        transition: mounted
          ? [
              `transform ${isHovered ? 200 : dur}ms cubic-bezier(0.34,${isHovered ? 1.18 : 1.06},0.64,1) ${isHovered ? 0 : delay}ms`,
              `opacity ${Math.round(dur * 0.85)}ms ease ${delay}ms`,
              `filter 200ms ease`,
            ].join(', ')
          : 'none',
        pointerEvents: dimmed ? 'none' : 'auto',
        zIndex: isHovered ? 5 : 1,
        filter: dimmed ? 'grayscale(0.9) brightness(0.35)' : 'none',
      }}
    >
      <button
        onClick={() => onSelect(tool.id)}
        onMouseEnter={() => onHover(tool.id)}
        onMouseLeave={() => onHover(null)}
        style={{
          width: '100%', height: '100%',
          borderRadius: 12,
          border: `1px solid ${
            isHovered
              ? rgba(tool.color, 0.70)
              : isRec || highlighted
              ? rgba(tool.color, 0.40)
              : 'rgba(255,255,255,0.08)'
          }`,
          // Bookmark feel: top half has color gradient, bottom fades to near-black
          background: isHovered
            ? `linear-gradient(180deg,
                ${rgba(tool.color, 0.32)} 0%,
                ${rgba(tool.color, 0.10)} 40%,
                rgba(8,6,20,0.97) 100%
              )`
            : `linear-gradient(180deg,
                ${rgba(tool.color, isRec ? 0.22 : 0.14)} 0%,
                ${rgba(tool.color, 0.04)} 45%,
                rgba(8,6,20,0.96) 100%
              )`,
          boxShadow: isHovered
            ? [
                `0 0 0 1px ${rgba(tool.color, 0.25)}`,
                `0 16px 48px ${rgba(tool.color, 0.25)}`,
                `inset 0 1px 0 rgba(255,255,255,0.10)`,
              ].join(', ')
            : isRec
            ? `0 4px 20px ${rgba(tool.color, 0.18)}, inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 2px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
          backdropFilter: 'none',
          cursor: 'pointer',
          outline: 'none',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: cardH * 0.16,
          gap: 7,
          transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
        }}
      >
        {/* Top accent bar — bookmark ribbon effect */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg,
            transparent 5%,
            ${rgba(tool.color, isHovered ? 1 : isRec ? 0.75 : 0.45)} 50%,
            transparent 95%
          )`,
        }} />

        {/* Glow halo behind icon */}
        <div style={{
          position: 'absolute',
          top: cardH * 0.14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: cardW * 0.7,
          height: cardW * 0.7,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rgba(tool.color, isHovered ? 0.22 : 0.08)}, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'background 0.22s ease',
        }} />

        {/* Main icon */}
        <span style={{
          fontSize: Math.round(32 * Math.min(spiralScale, 1.2)),
          lineHeight: 1,
          position: 'relative', zIndex: 1,
          filter: isHovered ? `drop-shadow(0 0 10px ${rgba(tool.color, 0.9)})` : 'none',
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
          transition: 'filter 0.22s ease, transform 0.22s cubic-bezier(0.34,1.3,0.64,1)',
        }}>
          {tool.icon}
        </span>

        {/* Label */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: isHovered
            ? 'rgba(255,255,255,0.95)'
            : isRec || highlighted
            ? rgba(tool.color, 0.95)
            : 'rgba(255,255,255,0.58)',
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: '88%',
          position: 'relative', zIndex: 1,
          transition: 'color 0.18s ease',
        }}>
          {tool.label}
        </span>

        {/* Bottom watermark icon — large decorative */}
        <div style={{
          position: 'absolute',
          bottom: -10, right: -6,
          fontSize: cardH * 0.50,
          lineHeight: 1,
          opacity: isHovered ? 0.10 : 0.05,
          filter: 'blur(1px)',
          pointerEvents: 'none',
          transition: 'opacity 0.22s ease',
          userSelect: 'none',
        }}>
          {tool.icon}
        </div>

        {/* Bottom subtle color wash — like bookmark tail */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: cardH * 0.28,
          background: `linear-gradient(0deg, ${rgba(tool.color, isHovered ? 0.08 : 0.03)}, transparent)`,
          pointerEvents: 'none',
          transition: 'background 0.22s ease',
        }} />

        {/* Recommended star */}
        {isRec && (
          <div style={{
            position: 'absolute', top: 9, right: 10,
            fontSize: 9, fontWeight: 900,
            color: '#fbbf24',
            filter: 'drop-shadow(0 0 5px #fbbf2480)',
            lineHeight: 1, zIndex: 2,
          }}>
            ✦
          </div>
        )}

        {/* Hover corner shimmer */}
        {isHovered && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            background: `linear-gradient(135deg, ${rgba(tool.color, 0.10)} 0%, transparent 55%)`,
            pointerEvents: 'none',
          }} />
        )}
      </button>
    </div>
  )
})

// ── Main SpiralMenu ───────────────────────────────────────────────────────────
export default function SpiralMenu({
  tools, recommended, spiralScale, animSpeed, filterQuery, onSelectTool,
}: SpiralMenuProps): React.ReactElement {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mounted, setMounted]     = useState(false)

  const dur     = ANIM_DURATION[animSpeed]
  const stagger = STAGGER[animSpeed]
  const query   = filterQuery.trim().toLowerCase()

  const cardW = BASE_W * spiralScale
  const cardH = BASE_H * spiralScale
  const gap   = BASE_GAP * spiralScale

  const gridW = 5 * (cardW + gap) - gap
  const gridH = BRICK_ROWS.length * (cardH + gap) - gap

  const positions = useMemo(
    () => buildPositions(tools.length, cardW, cardH, gap),
    [tools.length, cardW, cardH, gap]
  )

  const matchMap = useMemo(() => {
    if (!query) return null
    const m: Record<string, boolean> = {}
    for (const t of tools) {
      m[t.id] = t.label.toLowerCase().includes(query) || t.id.toLowerCase().includes(query)
    }
    return m
  }, [tools, query])

  const handleHover = useCallback((id: string | null) => setHoveredId(id), [])

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 24)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%', top: '52%',
        transform: 'translate(-50%, -50%)',
        zIndex: 15,
        width: gridW, height: gridH,
        pointerEvents: 'none',
      }}
    >
      {tools.map((tool, i) => {
        const pos = positions[i]
        if (!pos) return null
        const matches     = matchMap ? matchMap[tool.id] : true
        const dimmed      = query.length > 0 && !matches
        const highlighted = query.length > 0 && !!matches
        return (
          <ToolCard
            key={tool.id}
            tool={tool} pos={pos}
            cardW={cardW} cardH={cardH}
            dur={dur} stagger={stagger} index={i}
            spiralScale={spiralScale}
            isHovered={hoveredId === tool.id}
            isRec={recommended.includes(tool.id)}
            dimmed={dimmed}
            highlighted={highlighted}
            mounted={mounted}
            onHover={handleHover}
            onSelect={onSelectTool}
          />
        )
      })}
    </div>
  )
}
