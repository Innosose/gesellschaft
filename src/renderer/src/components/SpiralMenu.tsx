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
const TOTAL_ARC_DEG = 148

function getArcParams(vw: number, vh: number, scale: number) {
  const radius = Math.min(vh * 0.62 * scale, 820)
  const arcCenterX = vw / 2
  // 중앙 카드가 화면 정중앙에 위치하도록: arcCenterY - radius = vh/2
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
    const t = setTimeout(() => setMounted(true), index * staggerMs + 30)
    return () => clearTimeout(t)
  }, [index, staggerMs])

  const midIndex = (total - 1) / 2
  const distFromCenter = Math.abs(index - midIndex)
  const t = midIndex > 0 ? distFromCenter / midIndex : 0  // 0=center, 1=edge

  // Scale: center=2.4, edges shrink quadratically to 0.36
  const baseScale = Math.max(0.36, 2.4 - 2.04 * t * t)
  const activeScale = hovered ? baseScale * 1.08 : baseScale

  // Opacity: center=1.0, edges fade to 0.18
  const baseOpacity = Math.max(0.18, 1.0 - 0.82 * Math.pow(t, 1.4))

  const hoverRadius = hovered ? radius + 36 : radius
  const { x, y } = cardPosition(angleDeg, hoverRadius, arcCenterX, arcCenterY)

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
        background: hovered
          ? `linear-gradient(175deg, #2e2518, #201c10)`
          : isCenter
            ? `linear-gradient(175deg, #2a2318, #1e1a10)`
            : `linear-gradient(175deg, #1e1a12, #151208)`,
        border: `2px solid ${hovered ? tool.color + 'ff' : tool.color + (isCenter ? 'dd' : '55')}`,
        boxShadow: hovered
          ? `0 0 32px ${tool.color}88, 0 16px 48px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)`
          : isCenter
            ? `0 0 22px ${tool.color}66, 0 10px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)`
            : isRecommended
              ? `0 0 14px ${tool.color}55, 0 6px 20px rgba(0,0,0,0.6)`
              : `0 4px 14px rgba(0,0,0,0.55)`,
        transition: `left ${animDuration}ms cubic-bezier(0.22,1,0.36,1),
                     top ${animDuration}ms cubic-bezier(0.22,1,0.36,1),
                     transform ${animDuration * 0.7}ms cubic-bezier(0.22,1,0.36,1),
                     opacity ${animDuration * 0.6}ms ease,
                     border-color ${animDuration * 0.5}ms ease,
                     box-shadow ${animDuration * 0.5}ms ease`,
        opacity: mounted ? (hovered ? 1 : baseOpacity) : 0,
        zIndex: hovered ? 25 : isCenter ? 16 : 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Color header strip */}
      <div style={{
        background: hovered || isCenter ? tool.color : `linear-gradient(90deg, ${tool.color}cc, ${tool.color}66)`,
        height: isCenter ? 6 : 4,
        flexShrink: 0,
        transition: `height ${animDuration * 0.4}ms ease, background ${animDuration * 0.4}ms ease`,
      }} />

      {/* Counter-rotated content */}
      <div style={{
        flex: 1,
        transform: `rotate(${-angleDeg}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 8px 12px',
      }}>
        {isRecommended && (
          <div style={{
            position: 'absolute',
            top: 10, right: 8,
            fontSize: 9, fontWeight: 700,
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.15)',
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 4,
            padding: '1px 5px',
            letterSpacing: '0.04em',
          }}>AI</div>
        )}

        <span style={{
          fontSize: hovered || isCenter ? 34 : 26,
          lineHeight: 1,
          transition: `font-size ${animDuration * 0.4}ms ease`,
          filter: (hovered || isCenter) ? `drop-shadow(0 2px 8px ${tool.color}99)` : undefined,
        }}>
          {tool.icon}
        </span>

        <span style={{
          fontSize: isCenter ? 12 : 10.5,
          fontWeight: isCenter || hovered ? 700 : 600,
          color: hovered ? '#ffffff' : isCenter ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          lineHeight: 1.35,
          wordBreak: 'keep-all',
          transition: `color ${animDuration * 0.4}ms ease, font-size ${animDuration * 0.4}ms ease`,
        }}>
          {tool.label}
        </span>
      </div>

      {/* Bottom color tint */}
      <div style={{
        height: 18,
        background: `linear-gradient(to top, ${tool.color}${isCenter ? '28' : '14'}, transparent)`,
        flexShrink: 0,
        transition: 'background 0.3s ease',
      }} />
    </div>
  )
})

// ─── Grid Card (filter mode) ────────────────────────────────────────────────────
const GridCard = memo(function GridCard({
  tool, isRecommended, animDuration, onSelect,
}: {
  tool: Tool; isRecommended: boolean; animDuration: number; onSelect: () => void
}) {
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

// ─── Main SpiralMenu ────────────────────────────────────────────────────────────
export default function SpiralMenu({
  tools, recommended, spiralScale, animSpeed, filterQuery, onSelectTool,
}: SpiralMenuProps): React.ReactElement {
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const [centerIdx, setCenterIdx] = useState(0)
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

  // Rotate: reorder tools so centerIdx is always at the visual center
  const displayTools = useMemo(() => {
    if (isSearching) return filteredTools
    const N = tools.length
    const mid = Math.floor(N / 2)
    return Array.from({ length: N }, (_, i) => tools[(centerIdx - mid + i + N) % N])
  }, [tools, centerIdx, isSearching, filteredTools])

  const rotate = useCallback((dir: 1 | -1) => {
    setCenterIdx(i => (i + dir + tools.length) % tools.length)
  }, [tools.length])

  // Keyboard: arrow keys rotate the fan
  useEffect(() => {
    if (isSearching) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') rotate(-1)
      else if (e.key === 'ArrowRight') rotate(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rotate, isSearching])

  // Mouse wheel: throttled rotation
  useEffect(() => {
    if (isSearching) return
    const handler = (e: WheelEvent): void => {
      if (wheelCooldown.current) return
      wheelCooldown.current = true
      rotate(e.deltaY > 0 ? 1 : -1)
      setTimeout(() => { wheelCooldown.current = false }, 120)
    }
    window.addEventListener('wheel', handler, { passive: true })
    return () => window.removeEventListener('wheel', handler)
  }, [rotate, isSearching])

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

  // ── Filter / search mode ─────────────────────────────────────────────────────
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

  // ── Fan mode ─────────────────────────────────────────────────────────────────
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

      {/* Rotation controls */}
      <div style={{
        position: 'fixed',
        bottom: 156,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        pointerEvents: 'auto',
        animation: 'fadeScaleIn 0.3s ease 0.2s both',
      }}>
        <button
          onClick={() => rotate(-1)}
          style={{
            width: 38, height: 38, borderRadius: '50%',
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
        >‹</button>

        {/* Center label */}
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'rgba(255,210,120,0.85)',
          background: 'rgba(18,12,6,0.88)',
          border: '1px solid rgba(210,148,50,0.25)',
          borderRadius: 20,
          padding: '5px 16px',
          backdropFilter: 'blur(10px)',
          minWidth: 120, textAlign: 'center',
          letterSpacing: '0.02em',
        }}>
          {centerToolLabel}
        </div>

        <button
          onClick={() => rotate(1)}
          style={{
            width: 38, height: 38, borderRadius: '50%',
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
        >›</button>
      </div>

      {/* Hint text */}
      <div style={{
        position: 'fixed',
        bottom: 140,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        fontSize: 10,
        color: 'rgba(255,200,100,0.3)',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}>
        ← → 키 또는 스크롤로 회전
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </>
  )
}
