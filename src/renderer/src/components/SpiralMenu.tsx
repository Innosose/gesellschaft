import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'

// ═══════════════════════════════════════════════
// SECTION: Types & Constants
// ═══════════════════════════════════════════════

interface Tool { id: string; icon: string; label: string; color: string; description?: string }
interface SpiralMenuProps {
  tools: Tool[]
  spiralScale: number; animSpeed: 'slow' | 'normal' | 'fast' | 'none'
  filterQuery: string; onSelectTool: (id: string) => void
}

const ANIM_MS: Record<string, number> = { slow: 600, normal: 350, fast: 180, none: 0 }
const STAGGER_MS: Record<string, number> = { slow: 50, normal: 30, fast: 12, none: 0 }
/* Responsive card size — scales with viewport, smaller on mobile */
function getCardSize(vw: number, vh: number): { w: number; h: number } {
  const ar = getCurrentTheme().shape.aspectRatio
  const isMobile = vw <= 768
  const minW = isMobile ? 64 : 90
  const maxW = isMobile ? 100 : 150
  const factor = isMobile ? 0.12 : 0.085
  const w = Math.round(Math.min(Math.max(vw * factor, minW), maxW))
  const h = Math.round(w / ar)
  return { w, h }
}
const TOTAL_ARC_DEG = 160
const VISIBLE_COUNT = 7
const RECENT_KEY = 'gesellschaft-recent-tools'
const MAX_RECENT = 5
import { T, useTheme, getCurrentTheme, rgba } from '../utils/theme'

/** Theme primary color (hex) */
function getGOLD(): string { return getCurrentTheme().primary }
/** Theme accent color (hex) */
function getTEAL(): string { return getCurrentTheme().accent }

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: 'Core',       ids: ['ai','clipboard','jot','haste'] },
  { label: 'Overlay',    ids: ['notepin','whiteboard','ruler','xcolor','zone'] },
  { label: 'Quick Use',  ids: ['quickCalc','generator','type','upload','keyboard'] },
  { label: 'Schedule',   ids: ['memoAlarm','organizer','stopwatch','launcher'] },
  { label: 'Documents',  ids: ['pdfTool','excelTool','imageTools','diff','batch','finder'] },
  { label: 'System',     ids: ['vault','yourInfo'] },
]

function getRecentTools(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] } }
function addRecentTool(id: string): void { const p = getRecentTools().filter(x => x !== id); localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...p].slice(0, MAX_RECENT))) }

const FAV_KEY = 'gs-favorites'
function getFavorites(): string[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') } catch { return [] } }
function toggleFavorite(id: string): string[] { const f = getFavorites(); const next = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; localStorage.setItem(FAV_KEY, JSON.stringify(next)); return next }
function getArcParams(vw: number, vh: number, scale: number) {
  const isMobile = vw <= 768
  const r = isMobile ? Math.min(vh * 0.52 * scale, 500) : Math.min(vh * 0.62 * scale, 820)
  return { radius: r, arcCenterX: vw / 2, arcCenterY: (isMobile ? vh * 0.50 : vh * 0.55) + r }
}
function cardPosition(deg: number, r: number, cx: number, cy: number) { const rad = (deg * Math.PI) / 180; return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) } }

// ═══════════════════════════════════════════════
// SECTION: Card Ornament SVG
// ═══════════════════════════════════════════════

/* Card ornament SVG — switches style per theme, respects card shape */
const CardOrnament = memo(function CardOrnament({ color, borderColor }: { color: string; borderColor?: string }): React.ReactElement {
  const theme = getCurrentTheme()
  const style = theme.ornament
  const { borderRadius, clipPath } = theme.shape
  /* SVG sits inside card and is clipped to same shape */
  const wrap: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
    borderRadius, clipPath, overflow: 'hidden',
  }
  /* Inset margin (% of viewBox) to keep strokes inside rounded/clipped edges.
     Computed per shape: hexagon needs 17, blob/leaf shapes need 12-17, circle 18, mild rounding 8 */
  const m = (() => {
    if (clipPath?.includes('50% 0%')) return 17     // hexagon (violet)
    if (clipPath) return 14                          // octagon (crimson)
    if (borderRadius === '50%') return 18            // circle (rose)
    if (borderRadius.includes('/')) return 17         // elliptical blob (arctic: 50%/40%/60%)
    if (borderRadius.includes('40%')) return 13      // leaf shape (emerald: 40% top corners)
    const pct = parseInt(borderRadius)               // e.g. '22%' → 22
    if (pct >= 30) return 17                         // large % radius
    return 8                                         // mild rounding (ruina, sunset, mono)
  })()
  const x1 = m, y1 = m, x2 = 100 - m, y2 = 100 - m
  const cx = 50, cy = 50
  return (
    <div aria-hidden="true" style={wrap}>
    <svg viewBox="0 0 100 100" fill="none" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {/* Shape-following border — SVG polygon matches clipPath exactly */}
      {borderColor && clipPath && (() => {
        /* Parse "polygon(8% 0%, 92% 0%, ...)" → SVG points "8,0 92,0 ..." */
        const pts = clipPath.replace(/polygon\(|\)/g, '').split(',')
          .map(p => p.trim().split(/\s+/).map(v => parseFloat(v)).join(',')).join(' ')
        return <polygon points={pts} stroke={borderColor} strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />
      })()}
      {borderColor && !clipPath && (
        <rect x="0.5" y="0.5" width="99" height="99" rx="4" stroke={borderColor} strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
      )}

      {style === 'book' && <>
        {/* Double frame */}
        <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} rx="2" stroke={color} strokeWidth="0.5" opacity="0.18" />
        <rect x={x1 + 3} y={y1 + 3} width={x2 - x1 - 6} height={y2 - y1 - 6} rx="1.5" stroke={color} strokeWidth="0.25" opacity="0.1" />
        {/* Corner filigree */}
        <path d={`M${x1 + 2} ${y1 + 2} Q${x1 + 2} ${y1 + 9} ${x1 + 7} ${y1 + 10} Q${x1 + 4} ${y1 + 10} ${x1 + 2} ${y1 + 15}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.22" />
        <path d={`M${x2 - 2} ${y1 + 2} Q${x2 - 2} ${y1 + 9} ${x2 - 7} ${y1 + 10} Q${x2 - 4} ${y1 + 10} ${x2 - 2} ${y1 + 15}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.22" />
        <path d={`M${x1 + 2} ${y2 - 2} Q${x1 + 2} ${y2 - 9} ${x1 + 7} ${y2 - 10} Q${x1 + 4} ${y2 - 10} ${x1 + 2} ${y2 - 15}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.22" />
        <path d={`M${x2 - 2} ${y2 - 2} Q${x2 - 2} ${y2 - 9} ${x2 - 7} ${y2 - 10} Q${x2 - 4} ${y2 - 10} ${x2 - 2} ${y2 - 15}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.22" />
        <path d={`M${cx} ${y1 + 4} L${cx} ${y1 + 18}`} stroke={color} strokeWidth="0.35" opacity="0.12" strokeLinecap="round" />
        <circle cx={cx} cy={y2 - 10} r="6" stroke={color} strokeWidth="0.35" opacity="0.12" />
        <circle cx={cx} cy={y2 - 10} r="3.5" stroke={color} strokeWidth="0.25" opacity="0.08" />
        <line x1={x1 + 4} y1={y1 + 18} x2={x1 + 4} y2={y2 - 18} stroke={color} strokeWidth="0.4" opacity="0.08" />
        <path d={`M${x1 + 15} ${cy} Q${cx - 8} ${cy - 4} ${cx} ${cy} Q${cx + 8} ${cy - 4} ${x2 - 15} ${cy}`} stroke={color} strokeWidth="0.35" fill="none" opacity="0.07" />
      </>}

      {style === 'crack' && <>
        {/* Cracked glass / lava veins */}
        <path d={`M${cx} ${y1} L${cx - 2} ${y1 + 18} L${cx + 2} ${cy - 8} L${cx - 4} ${cy} L${cx + 4} ${cy + 15} L${cx - 2} ${y2 - 12} L${cx} ${y2}`} stroke={color} strokeWidth="0.4" opacity="0.2" />
        <path d={`M${cx - 2} ${y1 + 18} L${x1 + 12} ${y1 + 26} M${cx + 2} ${cy - 8} L${x2 - 12} ${cy - 14} M${cx - 4} ${cy} L${x1 + 8} ${cy + 5}`} stroke={color} strokeWidth="0.3" opacity="0.12" />
        <path d={`M${x1} ${cy} L${x1 + 16} ${cy - 2} L${cx - 8} ${cy + 2}`} stroke={color} strokeWidth="0.3" opacity="0.15" />
        <path d={`M${x2} ${cy} L${x2 - 16} ${cy + 2} L${cx + 8} ${cy - 2}`} stroke={color} strokeWidth="0.3" opacity="0.15" />
        <circle cx={cx - 2} cy={y1 + 18} r="1.5" fill={color} opacity="0.1" />
        <circle cx={cx + 4} cy={cy + 15} r="1.5" fill={color} opacity="0.1" />
      </>}

      {style === 'vine' && <>
        {/* Vine and leaves — inside safe area */}
        <path d={`M${x1 + 4} ${y2 - 4} Q${x1 + 4} ${cy} ${x1 + 18} ${cy - 8} Q${cx - 8} ${y1 + 18} ${cx} ${y1 + 14} Q${cx + 12} ${y1 + 10} ${x2 - 8} ${y1 + 4}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.18" />
        <path d={`M${x1 + 18} ${cy - 8} Q${x1 + 10} ${cy - 14} ${x1 + 8} ${y1 + 22}`} stroke={color} strokeWidth="0.3" fill="none" opacity="0.12" />
        <ellipse cx={x1 + 8} cy={y1 + 22} rx="3.5" ry="2" fill={color} opacity="0.06" transform={`rotate(-30 ${x1 + 8} ${y1 + 22})`} />
        <ellipse cx={x2 - 10} cy={y1 + 6} rx="3" ry="1.8" fill={color} opacity="0.05" transform={`rotate(15 ${x2 - 10} ${y1 + 6})`} />
        <path d={`M${x2 - 6} ${y2 - 10} Q${x2 - 14} ${cy + 10} ${cx + 4} ${cy + 8} Q${cx - 4} ${cy + 6} ${cx - 8} ${cy + 10}`} stroke={color} strokeWidth="0.3" fill="none" opacity="0.1" />
        <ellipse cx={cx - 8} cy={cy + 10} rx="3" ry="1.8" fill={color} opacity="0.04" transform={`rotate(-10 ${cx - 8} ${cy + 10})`} />
      </>}

      {style === 'frost' && <>
        {/* Ice crystals — centered, within safe area */}
        <path d={`M${cx} ${y1 + 6} L${cx} ${y2 - 6} M${x1 + 6} ${cy} L${x2 - 6} ${cy}`} stroke={color} strokeWidth="0.3" opacity="0.1" />
        <path d={`M${x1 + 12} ${y1 + 12} L${x2 - 12} ${y2 - 12} M${x2 - 12} ${y1 + 12} L${x1 + 12} ${y2 - 12}`} stroke={color} strokeWidth="0.2" opacity="0.06" />
        <path d={`M${cx} ${y1 + 16} L${cx - 5} ${y1 + 10} M${cx} ${y1 + 16} L${cx + 5} ${y1 + 10}`} stroke={color} strokeWidth="0.3" opacity="0.12" />
        <path d={`M${cx} ${y2 - 16} L${cx - 5} ${y2 - 10} M${cx} ${y2 - 16} L${cx + 5} ${y2 - 10}`} stroke={color} strokeWidth="0.3" opacity="0.12" />
        <path d={`M${x1 + 16} ${cy} L${x1 + 10} ${cy - 5} M${x1 + 16} ${cy} L${x1 + 10} ${cy + 5}`} stroke={color} strokeWidth="0.3" opacity="0.12" />
        <path d={`M${x2 - 16} ${cy} L${x2 - 10} ${cy - 5} M${x2 - 16} ${cy} L${x2 - 10} ${cy + 5}`} stroke={color} strokeWidth="0.3" opacity="0.12" />
        <circle cx={cx} cy={cy} r="8" stroke={color} strokeWidth="0.3" opacity="0.08" />
        <circle cx={cx} cy={cy} r="3" stroke={color} strokeWidth="0.3" opacity="0.12" />
      </>}

      {style === 'gem' && <>
        {/* Crystal facets — centered diamond */}
        <path d={`M${cx} ${y1 + 6} L${x1 + 8} ${cy - 8} L${cx} ${cy} L${x2 - 8} ${cy - 8} Z`} stroke={color} strokeWidth="0.4" fill="none" opacity="0.15" />
        <path d={`M${cx} ${cy} L${x1 + 8} ${cy + 8} L${cx} ${y2 - 6} L${x2 - 8} ${cy + 8} Z`} stroke={color} strokeWidth="0.4" fill="none" opacity="0.12" />
        <path d={`M${x1 + 8} ${cy - 8} L${x1 + 8} ${cy + 8} M${x2 - 8} ${cy - 8} L${x2 - 8} ${cy + 8}`} stroke={color} strokeWidth="0.25" opacity="0.08" />
        <line x1={cx} y1={y1 + 6} x2={cx} y2={y2 - 6} stroke={color} strokeWidth="0.2" opacity="0.06" />
        <circle cx={cx} cy={cy} r="2" fill={color} opacity="0.12" />
      </>}

      {style === 'minimal' && <>
        {/* Clean corner brackets */}
        <line x1={x1 + 2} y1={y1 + 2} x2={x1 + 14} y2={y1 + 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x1 + 2} y1={y1 + 2} x2={x1 + 2} y2={y1 + 14} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x2 - 14} y1={y1 + 2} x2={x2 - 2} y2={y1 + 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x2 - 2} y1={y1 + 2} x2={x2 - 2} y2={y1 + 14} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x1 + 2} y1={y2 - 2} x2={x1 + 14} y2={y2 - 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x1 + 2} y1={y2 - 14} x2={x1 + 2} y2={y2 - 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x2 - 14} y1={y2 - 2} x2={x2 - 2} y2={y2 - 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
        <line x1={x2 - 2} y1={y2 - 14} x2={x2 - 2} y2={y2 - 2} stroke={color} strokeWidth="0.4" opacity="0.15" />
      </>}

      {style === 'flame' && <>
        {/* Rising flames — within safe area */}
        <path d={`M${cx - 16} ${y2 - 4} Q${cx - 18} ${cy + 4} ${cx - 12} ${cy - 6} Q${cx - 8} ${cy - 16} ${cx - 10} ${y1 + 14}`} stroke={color} strokeWidth="0.4" fill="none" opacity="0.15" />
        <path d={`M${cx} ${y2 - 4} Q${cx + 2} ${cy - 4} ${cx - 2} ${cy - 16} Q${cx - 4} ${y1 + 14} ${cx} ${y1 + 4}`} stroke={color} strokeWidth="0.5" fill="none" opacity="0.18" />
        <path d={`M${cx + 16} ${y2 - 4} Q${cx + 18} ${cy + 4} ${cx + 12} ${cy - 6} Q${cx + 8} ${cy - 16} ${cx + 10} ${y1 + 14}`} stroke={color} strokeWidth="0.4" fill="none" opacity="0.15" />
        <circle cx={cx - 10} cy={y1 + 12} r="2" fill={color} opacity="0.06" />
        <circle cx={cx} cy={y1 + 3} r="2.5" fill={color} opacity="0.08" />
        <circle cx={cx + 10} cy={y1 + 12} r="2" fill={color} opacity="0.06" />
      </>}

      {style === 'wave' && <>
        {/* Ocean waves — horizontal, inside safe area */}
        <path d={`M${x1} ${cy - 16} Q${x1 + 14} ${cy - 22} ${cx - 12} ${cy - 16} Q${cx} ${cy - 10} ${cx + 12} ${cy - 16} Q${x2 - 14} ${cy - 22} ${x2} ${cy - 16}`} stroke={color} strokeWidth="0.4" fill="none" opacity="0.15" />
        <path d={`M${x1} ${cy} Q${x1 + 14} ${cy - 6} ${cx - 12} ${cy} Q${cx} ${cy + 6} ${cx + 12} ${cy} Q${x2 - 14} ${cy - 6} ${x2} ${cy}`} stroke={color} strokeWidth="0.35" fill="none" opacity="0.12" />
        <path d={`M${x1} ${cy + 16} Q${x1 + 14} ${cy + 10} ${cx - 12} ${cy + 16} Q${cx} ${cy + 22} ${cx + 12} ${cy + 16} Q${x2 - 14} ${cy + 10} ${x2} ${cy + 16}`} stroke={color} strokeWidth="0.3" fill="none" opacity="0.1" />
        <circle cx={x1 + 12} cy={y1 + 10} r="1" fill={color} opacity="0.08" />
        <circle cx={x2 - 12} cy={y2 - 10} r="1.5" fill={color} opacity="0.06" />
      </>}
    </svg>
    </div>
  )
})

/** Base scale at the far edge of the fan arc */
const CARD_MIN_SCALE = 0.42
/** Scale boost at the center of the fan arc */
const CARD_SCALE_PEAK = 1.15
/** Gaussian falloff rate for card scale from center */
const CARD_SCALE_FALLOFF = 2.6
/** Minimum opacity for cards at the edges */
const CARD_MIN_OPACITY = 0.3
/** Maximum blur (px) applied to edge cards */
const CARD_MAX_BLUR = 1.5
/** 3D perspective depth for card transforms */
const CARD_PERSPECTIVE = 600

// ═══════════════════════════════════════════════
// SECTION: FanCard (individual tool card on the arc)
// ═══════════════════════════════════════════════

interface FanCardProps {
  tool: Tool; slotIndex: number; total: number; radius: number
  arcCenterX: number; arcCenterY: number
  isFavorite: boolean; isCenter: boolean; animDuration: number
  staggerMs: number; cardW: number; cardH: number
  onSelect: (id: string) => void; onRotateTo: (dir: number) => void
}

/* Typewriter text — starts after delay so book opens fully first */
function useTypewriter(text: string, active: boolean, speed = 30, delay = 500): string {
  const [displayed, setDisplayed] = useState('')
  const cancelled = useRef(false)
  useEffect(() => {
    cancelled.current = false
    if (!active) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    let iv: ReturnType<typeof setInterval> | null = null
    const dt = setTimeout(() => {
      if (cancelled.current) return
      iv = setInterval(() => {
        if (cancelled.current) { if (iv) clearInterval(iv); return }
        i++
        if (i > text.length) { if (iv) clearInterval(iv); return }
        setDisplayed(text.slice(0, i))
      }, speed)
    }, delay)
    return () => { cancelled.current = true; clearTimeout(dt); if (iv) clearInterval(iv) }
  }, [text, active, speed, delay])
  return displayed
}

/** True on touch-primary devices (phones/tablets) — disables hover-open card animation */
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches

const FanCard = memo(function FanCard({
  tool, slotIndex, total, radius, arcCenterX, arcCenterY,
  isFavorite, isCenter, animDuration, staggerMs, cardW, cardH, onSelect, onRotateTo,
}: FanCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [contentFade, setContentFade] = useState(false)
  const prevId = useRef(tool.id)
  const typedDesc = useTypewriter(tool.description ?? '', isCenter && hovered, 25, 550)

  useEffect(() => { const t = setTimeout(() => setMounted(true), slotIndex * staggerMs + 20); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevId.current !== tool.id) { prevId.current = tool.id; setContentFade(true); const t = setTimeout(() => setContentFade(false), 180); return () => clearTimeout(t) }
  }, [tool.id])

  const midIndex = (total - 1) / 2
  const distFromCenter = Math.abs(slotIndex - midIndex)
  const tNorm = midIndex > 0 ? distFromCenter / midIndex : 0
  const baseScale = CARD_MIN_SCALE + CARD_SCALE_PEAK * Math.exp(-CARD_SCALE_FALLOFF * tNorm)
  const activeScale = hovered ? baseScale * 1.06 : isCenter ? baseScale : baseScale * (1 - tNorm * 0.03)
  const baseOpacity = Math.max(CARD_MIN_OPACITY, 1.0 - 0.5 * tNorm * tNorm) // quadratic falloff — gentler
  const blurPx = tNorm * tNorm * CARD_MAX_BLUR // quadratic — sharp center, gentle edges
  const stepsToCenter = slotIndex - Math.floor(total / 2)
  const angleDeg = total <= 1 ? 0 : -TOTAL_ARC_DEG / 2 + slotIndex * (TOTAL_ARC_DEG / (total - 1))
  const { x, y } = cardPosition(angleDeg, radius, arcCenterX, arcCenterY)
  const handleClick = isCenter ? () => onSelect(tool.id) : () => onRotateTo(stepsToCenter)
  const open = isCenter && hovered

  const enterDelay = slotIndex * staggerMs

  return (
    <div role="button" tabIndex={0} aria-label={tool.label} onClick={handleClick} onKeyDown={e => e.key === 'Enter' && handleClick()} onMouseEnter={IS_TOUCH ? undefined : () => setHovered(true)} onMouseLeave={IS_TOUCH ? undefined : () => setHovered(false)}
      style={{
        position: 'fixed',
        left: x - cardW / 2,
        top: y - cardH / 2,
        width: cardW, height: cardH,
        transform: mounted
          ? `scale(${activeScale})`
          : 'scale(0.7) translateY(30px)',
        transformOrigin: 'center',
        opacity: mounted ? (hovered ? 1 : contentFade ? 0.15 : baseOpacity) : 0,
        filter: blurPx > 0.1 ? `blur(${blurPx}px)` : undefined,
        cursor: isCenter ? 'pointer' : stepsToCenter < 0 ? 'w-resize' : 'e-resize',
        perspective: CARD_PERSPECTIVE,
        transition: [
          `left ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`,
          `top ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`,
          `transform ${animDuration}ms cubic-bezier(0.34, 1.2, 0.64, 1)`,
          `opacity ${animDuration * 0.6}ms ease`,
          `filter ${animDuration * 0.5}ms ease`,
        ].join(', '),
        transitionDelay: mounted ? '0ms' : `${enterDelay}ms`,
        zIndex: hovered ? 25 : isCenter ? 16 : 12,
        userSelect: 'none', willChange: 'left, top, transform, opacity',
      } as React.CSSProperties}>

      {/* ── Inner page (always behind cover) ── */}
      {(() => {
        /* Compute safe inset % for inner content — matches CardOrnament margin logic per shape */
        const _cp = getCurrentTheme().shape.clipPath
        const _br = getCurrentTheme().shape.borderRadius
        const inPct = _cp?.includes('50% 0%') ? '17%' : _cp ? '14%' : _br === '50%' ? '20%' : _br.includes('/') ? '18%' : _br.includes('40%') ? '14%' : '10%'
        return (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: getCurrentTheme().shape.borderRadius, clipPath: getCurrentTheme().shape.clipPath,
          background: `linear-gradient(170deg, ${getCurrentTheme().surface} 0%, ${getCurrentTheme().bg} 100%)`,
          border: _cp ? 'none' : `1.5px solid ${rgba(getTEAL(), 0.1)}`,
          overflow: 'hidden',
        }}>
          {/* Inner pattern — theme dependent */}
          {getCurrentTheme().ornament === 'book' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{ position: 'absolute', left: inPct, right: inPct, top: `calc(${inPct} + ${i * 20}px)`, height: 1, background: `linear-gradient(90deg, ${rgba(getGOLD(), 0.06)}, transparent 85%)` }} />
            ))}
            <div style={{ position: 'absolute', left: inPct, top: inPct, bottom: inPct, width: 1, background: rgba(getGOLD(), 0.06) }} />
          </div>}
          {getCurrentTheme().ornament === 'crack' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: inPct, border: `1px solid ${rgba(getGOLD(), 0.04)}`, borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: '50%', top: inPct, bottom: inPct, width: 1, background: rgba(getGOLD(), 0.03) }} />
          </div>}
          {getCurrentTheme().ornament === 'gem' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: '55%', height: '55%', transform: 'translate(-50%,-50%) rotate(45deg)', border: `1px solid ${rgba(getGOLD(), 0.04)}` }} />
          </div>}
          {getCurrentTheme().ornament === 'frost' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: `${40 + i * 16}%`, height: `${40 + i * 16}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1px solid ${rgba(getGOLD(), 0.03)}` }} />
            ))}
          </div>}
          {getCurrentTheme().ornament === 'minimal' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: inPct, right: inPct, top: '50%', height: 1, background: rgba(getGOLD(), 0.04) }} />
          </div>}
          {(getCurrentTheme().ornament === 'vine' || getCurrentTheme().ornament === 'flame' || getCurrentTheme().ornament === 'wave') && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: inPct, borderRadius: getCurrentTheme().shape.borderRadius, border: `1px solid ${rgba(getGOLD(), 0.03)}` }} />
          </div>}

          {/* Typed text — uses safe inset */}
          <div style={{
            position: 'absolute', left: inPct, right: inPct, top: inPct, bottom: inPct,
            display: 'flex', alignItems: 'center',
            fontFamily: getCurrentTheme().bodyFont,
            color: rgba(getGOLD(), 0.8),
            opacity: open ? 1 : 0,
            transition: open ? 'opacity 0.2s ease 0.5s' : 'opacity 0.1s ease',
            overflow: 'hidden',
            lineHeight: '20px',
            textAlign: 'justify', wordBreak: 'keep-all', overflowWrap: 'break-word',
          }}>
            {typedDesc && (
              <span style={{ fontSize: 11, letterSpacing: '0.02em', display: 'block', width: '100%' }}>{typedDesc}</span>
            )}
            {open && typedDesc.length < (tool.description?.length ?? 0) && (
              <span style={{ color: rgba(getTEAL(), 0.5), fontSize: 10, animation: 'blink 0.8s step-end infinite' }}>|</span>
            )}
          </div>
        </div>
        )
      })()}

      {/* ── Book cover — computes border, shadow, and open/close transform per theme shape ── */}
      {(() => {
        const cp = getCurrentTheme().shape.clipPath
        const br = getCurrentTheme().shape.borderRadius
        const bw = isCenter ? 2 : 1.5
        const borderCol = rgba(hovered ? getTEAL() : getGOLD(), isCenter ? (open ? 0.15 : 0.3) : (hovered ? 0.25 : 0.08))
        const shadowFilter = isCenter && !open
          ? `drop-shadow(0 0 12px ${rgba(getTEAL(), 0.08)}) drop-shadow(0 4px 16px rgba(0,0,0,0.5))`
          : !isCenter && hovered
            ? `drop-shadow(0 0 8px ${rgba(getTEAL(), 0.06)}) drop-shadow(0 3px 12px rgba(0,0,0,0.35))`
            : !isCenter ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' : 'none'
        return (
      <div style={{ position: 'absolute', inset: 0, filter: shadowFilter, transition: 'filter 0.3s ease' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: br, clipPath: cp,
        background: getCurrentTheme().coverGradient,
        border: cp ? 'none' : `${bw}px solid ${borderCol}`,
        boxShadow: !cp && isCenter ? `inset 0 1px 0 ${rgba(getGOLD(), 0.06)}` : 'none',
        transformOrigin: getCurrentTheme().ornament === 'book' ? 'left center' : 'center center',
        transform: open
          ? getCurrentTheme().ornament === 'book' ? 'rotateY(-150deg)' : 'scale(0.85) rotateZ(3deg) translateY(-4px)'
          : 'none',
        transition: open
          ? `transform ${getCurrentTheme().openDuration ?? 500}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease 0.1s, box-shadow 0.3s ease, border-color 0.2s ease`
          : `transform ${(getCurrentTheme().openDuration ?? 500) * 0.7}ms cubic-bezier(0.25, 1, 0.5, 1), opacity 0.15s ease, box-shadow 0.3s ease, border-color 0.2s ease`,
        opacity: open ? 0 : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
      }}>
        <CardOrnament color={isCenter ? getTEAL() : rgba(getGOLD(), 0.3)} borderColor={borderCol} />

        {/* Spine — book only */}
        {getCurrentTheme().ornament === 'book' && <div aria-hidden="true" style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: isCenter ? 7 : 4,
          background: isCenter
            ? `linear-gradient(180deg, ${rgba(getGOLD(), 0.3)}, ${rgba(getGOLD(), 0.15)}, ${rgba(getGOLD(), 0.3)})`
            : `linear-gradient(180deg, ${rgba(getGOLD(), 0.08)}, ${rgba(getGOLD(), 0.03)}, ${rgba(getGOLD(), 0.08)})`,
          borderRadius: '3px 0 0 3px',
          boxShadow: isCenter ? 'inset -2px 0 4px rgba(0,0,0,0.3)' : 'none',
        }} />}

        {/* Edge accent — all themes, uses accent color */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: isCenter ? 3 : 1.5,
          background: isCenter
            ? `linear-gradient(90deg, ${rgba(getTEAL(), 0.5)}, ${rgba(getGOLD(), 0.15)} 60%, transparent)`
            : `linear-gradient(90deg, ${rgba(getTEAL(), 0.1)}, transparent)`,
        }} />

        {/* Title — editorial book cover layout, padding adapts to clipPath */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: cp?.includes('50% 0%') ? '22% 18%'  /* hexagon */
            : cp ? '12% 14%'                            /* octagon */
            : br === '50%' ? '24% 16%'                  /* circle */
            : br.includes('/') ? '20% 16%'              /* blob */
            : br.includes('40%') ? '18% 14%'            /* leaf */
            : isCenter ? '20px 20px' : '16px 14px',     /* mild rounding */
          position: 'relative', zIndex: 1, gap: isCenter ? 8 : 6,
        }}>
          {/* Top ornament line */}
          <div aria-hidden="true" style={{
            width: isCenter ? '50%' : '35%', height: 1,
            background: `linear-gradient(90deg, transparent, ${isCenter ? rgba(getTEAL(), 0.3) : rgba(getTEAL(), 0.1)}, transparent)`,
          }} />

          {/* Title — drop cap first letter, single words stay inline */}
          {(() => {
            const label = tool.label
            const words = label.split(' ')
            const isSingleWord = words.length === 1
            const titleColor = isCenter ? rgba(getTEAL(), 0.95) : rgba(getCurrentTheme().fg, Math.max(0.25, 0.65 - distFromCenter * 0.1))
            const capColor = isCenter ? rgba(getGOLD(), 0.9) : rgba(getGOLD(), Math.max(0.15, 0.45 - distFromCenter * 0.06))
            const shrink = cp ? 0.8 : br === '50%' ? 0.75 : 1
            const capSize = (isCenter ? 24 : Math.max(14, 20 - distFromCenter * 2)) * shrink
            const restSize = (isCenter ? 10 : Math.max(8, 9 - distFromCenter * 0.4)) * shrink
            const font = getCurrentTheme().titleFont

            if (isSingleWord) {
              return (
                <div style={{ textAlign: 'center', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                  <span style={{
                    fontFamily: font, fontSize: capSize, fontWeight: 900, color: capColor,
                    lineHeight: 1.1, letterSpacing: '0.06em',
                    textShadow: isCenter ? `0 0 14px ${rgba(getGOLD(), 0.3)}` : 'none',
                  }}>{label[0]}</span>
                  <span style={{
                    fontFamily: font, fontSize: restSize, fontWeight: 700, color: titleColor,
                    textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3,
                    textShadow: isCenter ? `0 0 8px ${rgba(getTEAL(), 0.15)}` : 'none',
                  }}>{label.slice(1)}</span>
                </div>
              )
            }

            return (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {words.map((word, wi) => (
                  <span key={wi} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                    <span style={{
                      fontFamily: font, fontSize: wi === 0 ? capSize : capSize * 0.7, fontWeight: 900, color: capColor,
                      lineHeight: 1.1, letterSpacing: '0.06em',
                      textShadow: isCenter ? `0 0 14px ${rgba(getGOLD(), 0.3)}` : 'none',
                    }}>{word[0]}</span>
                    <span style={{
                      fontFamily: font, fontSize: restSize, fontWeight: 700, color: titleColor,
                      textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3,
                      textShadow: isCenter ? `0 0 8px ${rgba(getTEAL(), 0.15)}` : 'none',
                    }}>{word.slice(1)}</span>
                  </span>
                ))}
              </div>
            )
          })()}

          {/* Bottom ornament line */}
          <div aria-hidden="true" style={{
            width: isCenter ? '40%' : '25%', height: 1,
            background: `linear-gradient(90deg, transparent, ${isCenter ? rgba(getGOLD(), 0.25) : rgba(getGOLD(), 0.08)}, transparent)`,
          }} />
        </div>

        {isFavorite && <div style={{ position: 'absolute', bottom: '12%', right: '12%', fontSize: 8, color: rgba(getGOLD(), 0.5), lineHeight: 1, pointerEvents: 'none' }}>★</div>}
      </div>
      </div>
      )})()}

      {hovered && !IS_TOUCH && !isCenter && tool.description && (
        <div style={{
          position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
          padding: '4px 10px', borderRadius: 4, fontSize: 10,
          background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.7),
          border: `1px solid ${rgba(T.gold, 0.1)}`,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30,
        }}>
          {tool.description}
        </div>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════
// SECTION: Overview Grid (all-tools view)
// ═══════════════════════════════════════════════
const OverviewGrid = memo(function OverviewGrid({ tools, recentIds, favoriteIds, animDuration, onSelect, onClose, onToggleFav }: {
  tools: Tool[]; recentIds: string[]
  favoriteIds: string[]; animDuration: number; onSelect: (id: string) => void; onClose: () => void
  onToggleFav: (id: string) => void
}) {
  const toolMap = useMemo(() => new Map(tools.map(t => [t.id, t])), [tools])
  const recentTools = useMemo(() => recentIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[], [recentIds, toolMap])
  const favTools = useMemo(() => favoriteIds.map(id => toolMap.get(id)).filter(Boolean) as Tool[], [favoriteIds, toolMap])
  const categorized = useMemo(() => {
    const placed = new Set<string>(); const groups: { label: string; tools: Tool[] }[] = []
    for (const cat of CATEGORIES) { const ct = cat.ids.map(id => toolMap.get(id)).filter(Boolean) as Tool[]; if (ct.length) { groups.push({ label: cat.label, tools: ct }); ct.forEach(t => placed.add(t.id)) } }
    const rest = tools.filter(t => !placed.has(t.id)); if (rest.length) groups.push({ label: '기타', tools: rest }); return groups
  }, [tools, toolMap])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.15s ease both' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(720px, 92vw)', maxHeight: '82vh', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#0a0804', backdropFilter: 'blur(40px)',
        borderRadius: 14, border: 'none',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)', padding: 'clamp(16px, 4vw, 24px)',
        animation: 'popIn 0.18s ease both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: rgba(T.fg, 0.9), letterSpacing: '-0.01em' }}>{tools.length}개 기능</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: rgba(getCurrentTheme().fg, 0.6), cursor: 'pointer', fontSize: 14, width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {favTools.length > 0 && <div style={{ marginBottom: 20 }}>
          <Lbl text="즐겨찾기" />
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>
            {favTools.map((t, i) => <OvCard key={t.id} tool={t} fav onSelect={onSelect} onToggleFav={onToggleFav} last={i === favTools.length - 1} />)}
          </div>
        </div>}

        {recentTools.length > 0 && <div style={{ marginBottom: 20 }}><Lbl text="최근" /><div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>{recentTools.map((t, i) => <OvCard key={t.id} tool={t} fav={favoriteIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} last={i === recentTools.length - 1} />)}</div></div>}
        {categorized.map(g => <div key={g.label} style={{ marginBottom: 20 }}><Lbl text={g.label} /><div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>{g.tools.map((t, i) => <OvCard key={t.id} tool={t} fav={favoriteIds.includes(t.id)} onSelect={onSelect} onToggleFav={onToggleFav} last={i === g.tools.length - 1} />)}</div></div>)}
      </div>
    </div>
  )
})

const Lbl = memo(function Lbl({ text }: { text: string }) {
  return <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: '-0.01em', color: rgba(T.fg, 0.45), marginBottom: 8, paddingLeft: 16, lineHeight: 1.4 }}>{text}</div>
})

const OvCard = memo(function OvCard({ tool, fav, onSelect, onToggleFav, last }: { tool: Tool; fav?: boolean; onSelect: (id: string) => void; onToggleFav?: (id: string) => void; last?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={() => onSelect(tool.id)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={tool.description} aria-label={tool.label + (tool.description ? ': ' + tool.description : '')} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderRadius: 0, cursor: 'pointer',
        background: h ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.15s ease', overflow: 'hidden', position: 'relative',
        minHeight: 48, width: '100%', textAlign: 'left',
      }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.color, opacity: h ? 0.9 : 0.4, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 400, color: h ? rgba(T.fg, 0.95) : rgba(T.fg, 0.85), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1.4 }}>{tool.label}</span>
      {fav && <span style={{ fontSize: 13, color: rgba(getGOLD(), 0.5), flexShrink: 0, lineHeight: 1 }}>★</span>}
      {onToggleFav && h && !fav && <span onClick={e => { e.stopPropagation(); onToggleFav(tool.id) }}
        style={{ fontSize: 13, color: rgba(T.fg, 0.2), cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
        title="즐겨찾기 추가">☆</span>}
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.25 }}>
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rgba(T.fg, 0.5) }} />
      </svg>
    </button>
  )
})

// ═══════════════════════════════════════════════
// SECTION: Search Card (filtered results)
// ═══════════════════════════════════════════════
const SearchCard = memo(function SearchCard({ tool, animDuration, onSelect }: { tool: Tool; animDuration: number; onSelect: (id: string) => void }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={() => onSelect(tool.id)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={tool.description} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', cursor: 'pointer',
        background: h ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: `background ${animDuration * 0.5}ms ease`, textAlign: 'left', width: '100%', color: 'inherit',
        minHeight: 48,
      }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.color, opacity: h ? 0.9 : 0.4, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 400, color: h ? rgba(T.fg, 0.95) : rgba(T.fg, 0.85), lineHeight: 1.4 }}>{tool.label}</span>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, marginLeft: 'auto', opacity: 0.25 }}>
        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rgba(T.fg, 0.5) }} />
      </svg>
    </button>
  )
})

// ═══════════════════════════════════════════════
// SECTION: Main SpiralMenu Component
// ═══════════════════════════════════════════════
export default function SpiralMenu({ tools, spiralScale, animSpeed, filterQuery, onSelectTool }: SpiralMenuProps): React.ReactElement {
  const theme = useTheme() // triggers re-render on theme change
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const [centerIdx, setCenterIdx] = useState(0)
  const [showOverview, setShowOverview] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>(getRecentTools)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavorites)
  const wheelCooldown = useRef(false)

  useEffect(() => { const h = (): void => { setVw(window.innerWidth); setVh(window.innerHeight) }; window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])

  const animDuration = ANIM_MS[animSpeed] ?? 300
  const staggerMs = STAGGER_MS[animSpeed] ?? 22
  const { radius, arcCenterX, arcCenterY } = useMemo(() => getArcParams(vw, vh, spiralScale), [vw, vh, spiralScale])
  const { w: cardW, h: cardH } = useMemo(() => getCardSize(vw, vh), [vw, vh])
  const isSearching = filterQuery.length > 0
  const filteredTools = useMemo(() => {
    if (!filterQuery) return tools
    const q = filterQuery.toLowerCase()
    // Check if query matches a category label exactly
    const catMatch = CATEGORIES.find(c => c.label.toLowerCase() === q)
    if (catMatch) return tools.filter(t => catMatch.ids.includes(t.id))
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
  }, [tools, filterQuery])
  const slotTools = useMemo(() => { if (isSearching) return filteredTools; const N = tools.length; const half = Math.floor(VISIBLE_COUNT / 2); return Array.from({ length: VISIBLE_COUNT }, (_, i) => tools[(centerIdx - half + i + N) % N]) }, [tools, centerIdx, isSearching, filteredTools])
  const rotate = useCallback((dir: number) => setCenterIdx(i => (i + dir + tools.length) % tools.length), [tools.length])

  useEffect(() => { if (isSearching || showOverview) return; const h = (e: KeyboardEvent): void => { if (e.key === 'ArrowLeft') rotate(-1); else if (e.key === 'ArrowRight') rotate(1); else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setShowOverview(s => !s) } else if (e.key === 'Home') { e.preventDefault(); setCenterIdx(0) } else if (e.key === 'End') { e.preventDefault(); setCenterIdx(tools.length - 1) } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [rotate, isSearching, showOverview, tools.length])
  useEffect(() => { if (isSearching || showOverview) return; const h = (e: WheelEvent): void => { if (wheelCooldown.current) return; wheelCooldown.current = true; rotate(e.deltaY > 0 ? 1 : -1); setTimeout(() => { wheelCooldown.current = false }, 250) }; window.addEventListener('wheel', h, { passive: true }); return () => window.removeEventListener('wheel', h) }, [rotate, isSearching, showOverview])

  // Touch swipe to rotate cards on mobile
  const touchStartX = useRef(0)
  useEffect(() => {
    if (isSearching || showOverview) return
    const onStart = (e: TouchEvent): void => { touchStartX.current = e.touches[0].clientX }
    const onEnd = (e: TouchEvent): void => {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      if (Math.abs(dx) > 40) rotate(dx < 0 ? 1 : -1)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd) }
  }, [rotate, isSearching, showOverview])

  const handleSelect = useCallback((id: string) => { addRecentTool(id); setRecentIds(getRecentTools()); onSelectTool(id) }, [onSelectTool])
  const handleToggleFav = useCallback((id: string) => { setFavoriteIds(toggleFavorite(id)) }, [])
  const centerToolLabel = slotTools[Math.floor(slotTools.length / 2)]?.label ?? ''

  if (isSearching) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', width: 'min(420px, 92vw)', maxHeight: '65vh', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#0a0804', backdropFilter: 'blur(32px)',
        borderRadius: 14, border: 'none',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)', padding: 'clamp(8px, 2vw, 16px)',
        display: 'flex', flexDirection: 'column', gap: 0, animation: 'fadeIn 0.12s ease both',
      }}>
        {filteredTools.length === 0
          ? <div style={{ padding: '20px 0', textAlign: 'center', color: rgba(T.fg, 0.35), fontSize: 15 }}>결과 없음</div>
          : <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>{filteredTools.map(t => <SearchCard key={t.id} tool={t} animDuration={animDuration} onSelect={handleSelect} />)}</div>}
      </div>
    </div>
  )

  return (
    <>
      {slotTools.map((tool, i) => (
        <FanCard key={`${theme.id}-${i}`} tool={tool} slotIndex={i} total={slotTools.length}
          radius={radius} arcCenterX={arcCenterX} arcCenterY={arcCenterY}
          isFavorite={favoriteIds.includes(tool.id)}
          isCenter={i === Math.floor(slotTools.length / 2)}
          animDuration={animDuration} staggerMs={staggerMs}
          cardW={cardW} cardH={cardH}
          onSelect={handleSelect} onRotateTo={rotate} />
      ))}

      <div style={{
        position: 'fixed', bottom: 'clamp(140px, 18vh, 190px)', left: '50%', transform: 'translateX(-50%)', zIndex: 22,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'auto', animation: 'slideUpFade 0.3s ease 0.2s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => rotate(-1)} className="spiral-nav-btn" aria-label="이전 도구" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M6 2L3 5l3 3"/></svg>
          </button>
          <div style={{
            fontSize: 11, fontWeight: 500, color: rgba(getGOLD(), 0.7),
            background: rgba(T.bg, 0.9), border: `1px solid ${rgba(getGOLD(), 0.1)}`,
            borderRadius: 4, padding: '4px 14px', backdropFilter: 'blur(16px)',
            minWidth: 100, textAlign: 'center', letterSpacing: '0.06em',
            fontFamily: getCurrentTheme().titleFont, textTransform: 'uppercase',
            lineHeight: 1.4, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{centerToolLabel}</div>
          <button onClick={() => rotate(1)} className="spiral-nav-btn" aria-label="다음 도구" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M4 2l3 3-3 3"/></svg>
          </button>
          <button onClick={() => setShowOverview(true)} title="전체" aria-label="전체 보기" className="spiral-overview-btn" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="1" width="3.5" height="3.5"/><rect x="5.5" y="1" width="3.5" height="3.5"/><rect x="1" y="5.5" width="3.5" height="3.5"/><rect x="5.5" y="5.5" width="3.5" height="3.5"/></svg>
          </button>
        </div>
      </div>

      {showOverview && <OverviewGrid tools={tools} recentIds={recentIds}
        favoriteIds={favoriteIds} animDuration={animDuration} onSelect={(id) => { setShowOverview(false); handleSelect(id) }}
        onClose={() => setShowOverview(false)} onToggleFav={handleToggleFav} />}

      <style>{`
        @keyframes slideUpFade { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  )
}
