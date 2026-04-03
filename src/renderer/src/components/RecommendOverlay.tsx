import React, { useState, useEffect, useCallback } from 'react'
import { rgba, getCurrentTheme } from '../utils/theme'
import { ALL_TOOLS } from '../../../shared/constants'

interface Props {
  recommendations: string[]
  reasons: Record<string, string>
  onSelect: (toolId: string) => void
  onDismiss: () => void
}

/**
 * AI recommendation card selection overlay.
 * Cards use simple rounded rectangles (no clipPath) to avoid clipping issues.
 */
export default function RecommendOverlay({ recommendations, reasons, onSelect, onDismiss }: Props): React.ReactElement {
  const [mounted, setMounted] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const theme = getCurrentTheme()

  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true))) }, [])

  // Keyboard: 1-3 to select, Esc to dismiss
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onDismiss(); return }
    const n = parseInt(e.key)
    if (n >= 1 && n <= tools.length) handleSelect(n - 1)
  }, [])
  useEffect(() => { window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey) }, [handleKey])

  const tools = recommendations.map(id => ALL_TOOLS.find(t => t.id === id)).filter(Boolean) as typeof ALL_TOOLS
  if (tools.length === 0) return <></>

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return
    setSelectedIdx(idx)
    setTimeout(() => onSelect(tools[idx].id), 500)
  }

  const count = tools.length
  const vw = window.innerWidth
  const cardW = Math.min(220, Math.max(140, vw * 0.16))
  const cardH = cardW * 1.5
  const gap = Math.min(32, cardW * 0.18)

  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: rgba(theme.bg, 0.88),
      backdropFilter: 'blur(40px) brightness(0.35)',
      WebkitBackdropFilter: 'blur(40px) brightness(0.35)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease',
      cursor: 'pointer',
    }}>
      {/* Title */}
      <div style={{
        marginBottom: 40, textAlign: 'center',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-30px)',
        transition: 'all 0.6s cubic-bezier(0.25,1,0.5,1) 0.15s',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
          color: rgba(theme.accent, 0.5), marginBottom: 8,
        }}>AI RECOMMENDATION</div>
        <div style={{
          fontSize: 26, fontWeight: 900, fontFamily: theme.titleFont,
          color: rgba(theme.fg, 0.9),
          textShadow: `0 0 30px ${rgba(theme.accent, 0.2)}, 0 2px 10px ${rgba(theme.bg, 0.5)}`,
        }}>추천 도구</div>
        <div style={{
          width: 80, height: 1, margin: '12px auto 0',
          background: `linear-gradient(90deg, transparent, ${rgba(theme.accent, 0.35)}, transparent)`,
        }} />
      </div>

      {/* Cards */}
      <div onClick={e => e.stopPropagation()} style={{
        display: 'flex', gap, alignItems: 'flex-end', justifyContent: 'center',
        cursor: 'default', padding: '0 20px',
      }}>
        {tools.map((tool, i) => {
          const hovered = hoveredIdx === i
          const selected = selectedIdx === i
          const dimmed = selectedIdx !== null && !selected
          const reason = reasons[tool.id] || 'AI 추천'
          const enterDelay = `${0.2 + i * 0.12}s`
          const tilt = count > 1 ? (i - (count - 1) / 2) * 3 : 0

          return (
            <div key={tool.id}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleSelect(i)}
              style={{
                width: cardW, height: cardH,
                borderRadius: 12,
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transform: mounted
                  ? selected ? 'scale(1.08) translateY(-20px)'
                    : hovered ? `translateY(-14px) scale(1.04) rotate(${tilt * 0.5}deg)`
                    : `rotate(${tilt}deg)`
                  : `translateY(60px) scale(0.85) rotate(${tilt}deg)`,
                opacity: mounted ? (dimmed ? 0.2 : 1) : 0,
                transition: mounted
                  ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, filter 0.3s ease'
                  : `all 0.6s cubic-bezier(0.25, 1, 0.5, 1) ${enterDelay}`,
                filter: selected ? `drop-shadow(0 0 30px ${rgba(theme.accent, 0.4)}) drop-shadow(0 8px 24px rgba(0,0,0,0.5))`
                  : hovered ? `drop-shadow(0 0 20px ${rgba(theme.accent, 0.15)}) drop-shadow(0 6px 20px rgba(0,0,0,0.4))`
                  : 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))',
                transformOrigin: 'center bottom',
              }}>
              {/* Card body — simple rounded rect, no clipPath */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: theme.coverGradient,
                border: `1.5px solid ${rgba(hovered || selected ? theme.accent : theme.primary, hovered || selected ? 0.4 : 0.12)}`,
                overflow: 'hidden',
                transition: 'border-color 0.3s ease',
              }}>
                {/* Top accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: selected ? 4 : 2,
                  background: `linear-gradient(90deg, ${rgba(theme.accent, hovered ? 0.7 : 0.4)}, transparent 70%)`,
                  transition: 'height 0.2s ease',
                }} />

                {/* Rank badge */}
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  width: 28, height: 28, borderRadius: 8,
                  background: rgba(theme.accent, hovered ? 0.15 : 0.08),
                  border: `1px solid ${rgba(theme.accent, hovered ? 0.3 : 0.12)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, fontFamily: theme.titleFont,
                  color: rgba(theme.accent, hovered ? 1 : 0.6),
                  transition: 'all 0.2s ease',
                }}>{i + 1}</div>

                {/* Tool color glow */}
                <div style={{
                  position: 'absolute', top: '20%', left: '15%', right: '15%', height: '35%',
                  borderRadius: '50%',
                  background: `radial-gradient(ellipse at center, ${rgba(tool.color, hovered ? 0.2 : 0.12)} 0%, transparent 65%)`,
                  transition: 'background 0.3s ease',
                }} />

                {/* Large initial letter */}
                <div style={{
                  position: 'absolute', top: '18%', left: 0, right: 0,
                  textAlign: 'center',
                  fontSize: cardW * 0.38, fontWeight: 900, fontFamily: theme.titleFont,
                  color: rgba(theme.fg, hovered ? 0.15 : 0.06),
                  lineHeight: 1, transition: 'color 0.3s ease',
                  pointerEvents: 'none',
                }}>{tool.label[0]}</div>

                {/* Bottom info — gradient overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '24px 14px 16px',
                  background: `linear-gradient(transparent, ${rgba(theme.bg, 0.85)} 25%, ${rgba(theme.bg, 0.95)})`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  {/* Tool name */}
                  <div style={{
                    fontSize: 14, fontWeight: 700, fontFamily: theme.titleFont,
                    color: rgba(theme.fg, 0.92),
                    textShadow: `0 0 12px ${rgba(theme.primary, 0.25)}`,
                    textAlign: 'center', lineHeight: 1.2,
                  }}>{tool.label}</div>

                  {/* Description */}
                  <div style={{
                    fontSize: 9, color: rgba(theme.fg, 0.4),
                    textAlign: 'center', lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  } as React.CSSProperties}>{tool.description}</div>

                  {/* Reason badge */}
                  <div style={{
                    fontSize: 9, fontWeight: 600,
                    color: theme.accent,
                    textAlign: 'center',
                    padding: '3px 10px',
                    borderRadius: 10,
                    background: rgba(theme.accent, 0.08),
                    border: `1px solid ${rgba(theme.accent, 0.12)}`,
                    maxWidth: '100%',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{reason}</div>
                </div>

                {/* Selected glow overlay */}
                {selected && <div style={{
                  position: 'absolute', inset: 0, borderRadius: 12,
                  background: `radial-gradient(ellipse at 50% 40%, ${rgba(theme.accent, 0.12)} 0%, transparent 50%)`,
                  animation: 'pulse 0.8s ease infinite',
                  pointerEvents: 'none',
                }} />}
              </div>

              {/* Keyboard hint */}
              <div style={{
                position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)',
                fontSize: 10, color: rgba(theme.fg, 0.25),
                opacity: mounted && selectedIdx === null ? 1 : 0,
                transition: 'opacity 0.3s ease 0.6s',
              }}>
                <kbd style={{
                  fontFamily: 'monospace', fontSize: 10, fontWeight: 600,
                  background: rgba(theme.fg, 0.05), padding: '1px 6px',
                  borderRadius: 3, border: `1px solid ${rgba(theme.fg, 0.08)}`,
                }}>{i + 1}</kbd>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dismiss hint */}
      <div style={{
        marginTop: 44, fontSize: 11, color: rgba(theme.fg, 0.25),
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease 0.7s',
        display: 'flex', gap: 16, alignItems: 'center',
      }}>
        <span>클릭하여 선택</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: rgba(theme.fg, 0.15) }} />
        <span>숫자 키로 빠른 선택</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: rgba(theme.fg, 0.15) }} />
        <span>Esc 또는 바깥 클릭으로 닫기</span>
      </div>
    </div>
  )
}
