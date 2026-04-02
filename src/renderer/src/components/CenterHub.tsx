import React, { memo, useEffect, useState } from 'react'
import { T, useTokens, useTheme, rgba, getCurrentTheme } from '../utils/theme'

interface CenterHubProps {
  isOpen: boolean; scanning: boolean
  hubColor: string; hubSize: number
  onClick: () => void; onScan: () => void
}

/** Hub scales 1.8x when opened */
const HUB_OPEN_SCALE = 1.8
/** Clock SVG occupies 82% of hub */
const CLOCK_SIZE_PCT = '82%'
/** Gear ring inner offset from hub edge */
const GEAR_INNER_OFFSET = 8
/** Gear ring outer offset from hub edge */
const GEAR_OUTER_OFFSET = 22
/** Neon letter animation delays (one per letter of GESELLSCHAFT) */
const NEON_DELAYS = [0.05, 0.35, 0.15, 0.55, 0.25, 0.7, 0.1, 0.45, 0.6, 0.3, 0.5, 0.2] as const
/** Hub open animation duration */
const HUB_ANIM_DURATION = '0.6s'
/** Hub position transition easing */
const HUB_EASING = 'cubic-bezier(0.34,1.15,0.64,1)'

/** Shared base style for clock SVGs (static parts — no filter) */
const CLOCK_SVG_STYLE: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%',
  width: CLOCK_SIZE_PCT, height: CLOCK_SIZE_PCT,
  transform: 'translate(-50%,-50%)',
  pointerEvents: 'none',
}

/* Clock face SVG — style varies per theme */
const ClockFace = memo(function ClockFace({ color, accent, active, clockStyle }: { color: string; accent: string; active?: boolean; clockStyle?: string }): React.ReactElement {
  const teal = accent
  const cs = clockStyle || 'antique'
  const themeFont = getCurrentTheme()
  const glow = active ? `drop-shadow(0 0 6px ${teal}) drop-shadow(0 0 14px ${color})` : 'none'
  return (
    <svg viewBox="0 0 120 120" fill="none" style={{ ...CLOCK_SVG_STYLE, filter: glow, transition: `filter ${HUB_ANIM_DURATION} ease` }}>
      {/* Outer rings — glow when active */}
      <circle cx="60" cy="60" r="57" stroke={active ? teal : color} strokeWidth={active ? '0.6' : '0'} opacity={active ? 0.25 : 0}>
        {active && <animate attributeName="opacity" values="0.15;0.3;0.15" dur="3s" repeatCount="indefinite" />}
      </circle>
      <circle cx="60" cy="60" r="56" stroke={color} strokeWidth={active ? '1.8' : '1.4'} opacity={active ? 0.7 : 0.4} />
      <circle cx="60" cy="60" r="52" stroke={color} strokeWidth={active ? '0.8' : '0.5'} opacity={active ? 0.35 : 0.2} />
      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180
        const r1 = active ? 44 : 46, r2 = 52
        const major = i % 3 === 0
        return <line key={i} x1={60 + r1 * Math.cos(a)} y1={60 + r1 * Math.sin(a)} x2={60 + r2 * Math.cos(a)} y2={60 + r2 * Math.sin(a)} stroke={major && active ? teal : color} strokeWidth={major ? (active ? '2.2' : '1.8') : (active ? '1' : '0.8')} opacity={major ? (active ? 0.9 : 0.65) : (active ? 0.5 : 0.35)} />
      })}
      {/* Minute ticks — only visible when active */}
      {active && Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null
        const a = (i * 6 - 90) * Math.PI / 180
        return <line key={`m${i}`} x1={60 + 50 * Math.cos(a)} y1={60 + 50 * Math.sin(a)} x2={60 + 52 * Math.cos(a)} y2={60 + 52 * Math.sin(a)} stroke={color} strokeWidth="0.4" opacity="0.25" />
      })}
      {/* Numerals — style dependent */}
      {(cs === 'antique' || cs === 'infernal' || cs === 'elegant' || cs === 'solar') && <>
        <text x="60" y="26" textAnchor="middle" dominantBaseline="central" fill={color} fontSize={active ? '9' : '8.5'} fontFamily={themeFont.titleFont} opacity={active ? 0.9 : 0.7}>XII</text>
        <text x="94" y="62" textAnchor="middle" dominantBaseline="central" fill={color} fontSize={active ? '9' : '8.5'} fontFamily={themeFont.titleFont} opacity={active ? 0.9 : 0.7}>III</text>
        <text x="60" y="97" textAnchor="middle" dominantBaseline="central" fill={color} fontSize={active ? '9' : '8.5'} fontFamily={themeFont.titleFont} opacity={active ? 0.9 : 0.7}>VI</text>
        <text x="26" y="62" textAnchor="middle" dominantBaseline="central" fill={color} fontSize={active ? '9' : '8.5'} fontFamily={themeFont.titleFont} opacity={active ? 0.9 : 0.7}>IX</text>
      </>}
      {(cs === 'digital') && <>
        <text x="60" y="26" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="8" fontFamily={themeFont.bodyFont} opacity={active ? 0.9 : 0.7}>12</text>
        <text x="94" y="62" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="8" fontFamily={themeFont.bodyFont} opacity={active ? 0.9 : 0.7}>3</text>
        <text x="60" y="97" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="8" fontFamily={themeFont.bodyFont} opacity={active ? 0.9 : 0.7}>6</text>
        <text x="26" y="62" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="8" fontFamily={themeFont.bodyFont} opacity={active ? 0.9 : 0.7}>9</text>
      </>}
      {(cs === 'crystal' || cs === 'frost') && <>
        {/* Diamond markers instead of numerals */}
        {[[60,22],[94,60],[60,98],[26,60]].map(([x,y],i) => <rect key={i} x={x-3} y={y-3} width="6" height="6" rx="1" transform={`rotate(45 ${x} ${y})`} fill={color} opacity={active ? 0.5 : 0.3} />)}
      </>}
      {(cs === 'nature') && <>
        {/* Leaf dots */}
        {[[60,22],[94,60],[60,98],[26,60]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="3" fill={color} opacity={active ? 0.35 : 0.2} />)}
      </>}

      {/* Outer decorations — style dependent */}
      {(cs === 'antique' || cs === 'solar') && <>
        {/* Gear teeth */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10) * Math.PI / 180, r = 57
          return <rect key={i} x={60 + r * Math.cos(a) - 1} y={60 + r * Math.sin(a) - 1} width="2" height="2" fill={active ? teal : color} opacity={active ? 0.2 : 0.1} transform={`rotate(${i * 10} ${60 + r * Math.cos(a)} ${60 + r * Math.sin(a)})`} />
        })}
      </>}
      {cs === 'infernal' && <>
        {/* Spike ring */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30) * Math.PI / 180, r1 = 54, r2 = 59
          return <line key={i} x1={60 + r1 * Math.cos(a)} y1={60 + r1 * Math.sin(a)} x2={60 + r2 * Math.cos(a)} y2={60 + r2 * Math.sin(a)} stroke={teal} strokeWidth="1.5" opacity={active ? 0.3 : 0.15} />
        })}
      </>}
      {cs === 'frost' && <>
        {/* Snowflake spokes */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * 60) * Math.PI / 180
          return <line key={i} x1={60 + 20 * Math.cos(a)} y1={60 + 20 * Math.sin(a)} x2={60 + 52 * Math.cos(a)} y2={60 + 52 * Math.sin(a)} stroke={color} strokeWidth="0.3" opacity="0.1" />
        })}
      </>}
      {cs === 'crystal' && <>
        {/* Hexagonal facets */}
        {Array.from({ length: 6 }, (_, i) => {
          const a1 = (i * 60) * Math.PI / 180, a2 = ((i + 1) * 60) * Math.PI / 180, r = 42
          return <line key={i} x1={60 + r * Math.cos(a1)} y1={60 + r * Math.sin(a1)} x2={60 + r * Math.cos(a2)} y2={60 + r * Math.sin(a2)} stroke={teal} strokeWidth="0.4" opacity={active ? 0.2 : 0.1} />
        })}
      </>}
      {cs === 'digital' && <>
        {/* Grid dots */}
        {Array.from({ length: 60 }, (_, i) => {
          if (i % 5 === 0) return null
          const a = (i * 6 - 90) * Math.PI / 180
          return <circle key={i} cx={60 + 53 * Math.cos(a)} cy={60 + 53 * Math.sin(a)} r="0.5" fill={color} opacity="0.15" />
        })}
      </>}

      {/* Center ornament */}
      <circle cx="60" cy="60" r={active ? 5 : 4} stroke={active ? teal : color} strokeWidth={active ? '1.2' : '1'} fill="none" opacity={active ? 0.6 : 0.45} />
      <circle cx="60" cy="60" r="1.8" fill={active ? teal : color} opacity={active ? 0.7 : 0.5} />

      {/* Scrollwork — antique/elegant only */}
      {(cs === 'antique' || cs === 'elegant') && <>
        <path d="M40 30 Q50 36 60 30 Q70 36 80 30" stroke={color} strokeWidth={active ? '0.7' : '0.5'} fill="none" opacity={active ? 0.3 : 0.15} />
        <path d="M40 90 Q50 84 60 90 Q70 84 80 90" stroke={color} strokeWidth={active ? '0.7' : '0.5'} fill="none" opacity={active ? 0.3 : 0.15} />
      </>}

      {/* Active decorative rings */}
      {active && <>
        <circle cx="60" cy="60" r="38" stroke={color} strokeWidth="0.3" opacity="0.15" strokeDasharray={cs === 'digital' ? '1 3' : '2 4'} />
        <circle cx="60" cy="60" r="28" stroke={teal} strokeWidth="0.3" opacity="0.1" strokeDasharray={cs === 'frost' ? '3 3' : '1 6'} />
      </>}
    </svg>
  )
})

/* Live clock hands — enhanced when active */
const ClockHands = memo(function ClockHands({ color, accent, active }: { color: string; accent: string; active?: boolean }): React.ReactElement {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const teal = accent
  const h = now.getHours() % 12, m = now.getMinutes(), sec = now.getSeconds()
  const hDeg = h * 30 + m * 0.5, mDeg = m * 6, sDeg = sec * 6
  const hx = 60 + 22 * Math.sin(hDeg * Math.PI / 180), hy = 60 - 22 * Math.cos(hDeg * Math.PI / 180)
  const mx = 60 + 32 * Math.sin(mDeg * Math.PI / 180), my = 60 - 32 * Math.cos(mDeg * Math.PI / 180)
  const sx = 60 + 38 * Math.sin(sDeg * Math.PI / 180), sy = 60 - 38 * Math.cos(sDeg * Math.PI / 180)
  const glow = active ? `drop-shadow(0 0 4px ${teal})` : 'none'
  return (
    <svg viewBox="0 0 120 120" fill="none" style={{ ...CLOCK_SVG_STYLE, filter: glow, transition: `filter ${HUB_ANIM_DURATION} ease` }}>
      {/* Glow underlayer for hands when active */}
      {active && <>
        <line x1="60" y1="60" x2={hx} y2={hy} stroke={teal} strokeWidth="5" strokeLinecap="round" opacity="0.12" />
        <line x1="60" y1="60" x2={mx} y2={my} stroke={teal} strokeWidth="4" strokeLinecap="round" opacity="0.1" />
        <line x1="60" y1="60" x2={sx} y2={sy} stroke={teal} strokeWidth="3" strokeLinecap="round" opacity="0.15" />
      </>}
      {/* Hour hand */}
      <line x1="60" y1="60" x2={hx} y2={hy} stroke={color} strokeWidth={active ? '2.5' : '2.2'} strokeLinecap="round" opacity={active ? 0.95 : 0.85} />
      {/* Minute hand */}
      <line x1="60" y1="60" x2={mx} y2={my} stroke={color} strokeWidth={active ? '1.6' : '1.4'} strokeLinecap="round" opacity={active ? 0.85 : 0.7} />
      {/* Second hand — teal with tail */}
      {active && <line x1="60" y1="60" x2={60 - 10 * Math.sin(sDeg * Math.PI / 180)} y2={60 + 10 * Math.cos(sDeg * Math.PI / 180)} stroke={teal} strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />}
      <line x1="60" y1="60" x2={sx} y2={sy} stroke={teal} strokeWidth={active ? '0.9' : '0.7'} strokeLinecap="round" opacity={active ? 0.9 : 0.75} />
      {/* Center cap */}
      {active && <circle cx="60" cy="60" r="2.5" fill={teal} opacity="0.5" />}
      <circle cx="60" cy="60" r="1.5" fill={active ? teal : color} opacity={active ? 0.9 : 0.6} />
    </svg>
  )
})

export default memo(function CenterHub({
  isOpen, scanning, hubColor, hubSize,
  onClick, onScan,
}: CenterHubProps): React.ReactElement {
  // Scale down hub on small screens to prevent overflow
  const isMobileView = typeof window !== 'undefined' && window.innerWidth <= 768
  const effectiveHubSize = isMobileView ? Math.min(hubSize, 110) : hubSize
  const actualSize = isOpen ? effectiveHubSize * HUB_OPEN_SCALE : effectiveHubSize
  const currentThemeData = useTheme()
  const t = useTokens()
  const gold = t.gold
  const teal = t.teal

  return (
    <div style={{
      position: 'fixed', left: '50%', top: isOpen ? 'clamp(14%, 18vh, 22%)' : '50%',
      transform: 'translate(-50%, -50%)', zIndex: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: isOpen ? 8 : 12, pointerEvents: 'none',
      transition: `top 0.5s ${HUB_EASING}`,
    }}>
      <div style={{ position: 'relative', pointerEvents: 'auto' }}>
        {/* Gear rings + glow — fade out on open */}
        {(() => {
          const ir = (isOpen ? hubSize : actualSize) / 2 + GEAR_INNER_OFFSET
          const or2 = (isOpen ? hubSize : actualSize) / 2 + GEAR_OUTER_OFFSET
          const irSvgR = ir + 6, orSvgR = or2 + 6
          const gearStyle: React.CSSProperties = { opacity: isOpen ? 0 : 1, transition: 'opacity 0.4s ease', pointerEvents: 'none' }
          return <>
            {/* Inner gear ring — clockwise */}
            <svg aria-hidden="true" width={irSvgR * 2} height={irSvgR * 2} viewBox={`${-irSvgR} ${-irSvgR} ${irSvgR * 2} ${irSvgR * 2}`} fill="none"
              style={{ ...gearStyle, position: 'absolute', left: `calc(50% - ${irSvgR}px)`, top: `calc(50% - ${irSvgR}px)`,
                animation: 'hubSpin 25s linear infinite' }}>
              <circle cx="0" cy="0" r={ir} stroke={gold} strokeWidth="0.8" opacity="0.2" />
              {Array.from({ length: 20 }, (_, i) => {
                const a = (i * 18) * Math.PI / 180
                return <line key={i} x1={(ir - 3) * Math.cos(a)} y1={(ir - 3) * Math.sin(a)} x2={(ir + 3) * Math.cos(a)} y2={(ir + 3) * Math.sin(a)} stroke={gold} strokeWidth="2" opacity="0.25" />
              })}
            </svg>
            {/* Outer gear ring — counter-clockwise */}
            <svg aria-hidden="true" width={orSvgR * 2} height={orSvgR * 2} viewBox={`${-orSvgR} ${-orSvgR} ${orSvgR * 2} ${orSvgR * 2}`} fill="none"
              style={{ ...gearStyle, position: 'absolute', left: `calc(50% - ${orSvgR}px)`, top: `calc(50% - ${orSvgR}px)`,
                animation: 'hubSpin 40s linear infinite reverse' }}>
              <circle cx="0" cy="0" r={or2} stroke={gold} strokeWidth="0.5" opacity="0.1" />
              {Array.from({ length: 28 }, (_, i) => {
                const a = (i * 360 / 28) * Math.PI / 180
                return <line key={i} x1={(or2 - 2) * Math.cos(a)} y1={(or2 - 2) * Math.sin(a)} x2={(or2 + 3) * Math.cos(a)} y2={(or2 + 3) * Math.sin(a)} stroke={gold} strokeWidth="1.5" opacity="0.15" />
              })}
            </svg>
            {/* Warm glow */}
            <div aria-hidden="true" style={{
              ...gearStyle, position: 'absolute', inset: -35, borderRadius: '50%',
              background: `radial-gradient(circle, ${rgba(gold, 0.12)} 0%, ${rgba(gold, 0.04)} 40%, transparent 65%)`,
              animation: 'hubGlow 5s ease-in-out infinite',
            }} />
          </>
        })()}

        <button onClick={onClick} aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'} title={isOpen ? '닫기' : '열기'} style={{
          position: 'relative', width: actualSize, height: actualSize,
          WebkitAppearance: 'none', appearance: 'none',
          border: 'none', background: 'none', backgroundColor: 'transparent',
          padding: 0, margin: 0, outline: 'none',
          cursor: 'pointer', transition: `width 0.5s ${HUB_EASING}, height 0.5s ${HUB_EASING}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'visible',
          animation: isOpen ? `${currentThemeData.hubOpenAnim} ${HUB_ANIM_DURATION} ease both` : undefined,
        }}>
          {/* Background layer — two stacked layers to avoid gradient↔solid transition flash */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: currentThemeData.shape.hubBorderRadius,
            background: currentThemeData.hubBg,
            overflow: 'hidden',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: currentThemeData.shape.hubBorderRadius,
            background: currentThemeData.hubBgOpen,
            opacity: isOpen ? 1 : 0,
            border: `1.5px solid ${rgba(gold, isOpen ? 0.15 : 0.3)}`,
            boxShadow: isOpen
              ? `0 0 12px ${rgba(gold, 0.08)}`
              : `${currentThemeData.hubGlow}, inset 0 0 40px ${rgba(gold, 0.06)}`,
            overflow: 'hidden',
            transition: 'opacity 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          }} />
          {/* Clock — clips to hub shape */}
          <div role="img" aria-label="시계" style={{
            position: 'absolute', inset: 0, borderRadius: currentThemeData.shape.hubBorderRadius,
            overflow: 'hidden', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClockFace color={gold} accent={teal} active={isOpen} clockStyle={currentThemeData.clock} />
            <ClockHands color={gold} accent={teal} active={isOpen} />
          </div>

          {/* Art deco title — each letter flickers off randomly when open */}
          {(() => {
            const letters = 'GESELLSCHAFT'.split('')
            // Stable random delays per letter (seeded by index)
            const delays = NEON_DELAYS
            const fontSize = Math.max(12, Math.round(actualSize * 0.1))
            const letterStyle: React.CSSProperties = {
              fontWeight: 900, fontFamily: currentThemeData.titleFont,
              color: T.fg,
              WebkitTextStroke: `0.5px ${teal}`,
              textShadow: `0 0 12px ${teal}, 0 0 30px ${rgba(teal, 0.5)}, 0 0 60px ${rgba(teal, 0.2)}`,
              display: 'inline-block',
              transition: `font-size 0.5s ${HUB_EASING}`,
            }
            return (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                userSelect: 'none',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0, lineHeight: 0.95 }}>
                  {/* Top row: GESELL */}
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    {letters.slice(0, 6).map((ch, i) => (
                      <span key={i} style={{
                        ...letterStyle, fontSize,
                        animation: isOpen
                          ? `neonLetterOff 0.6s ease-out ${delays[i]}s forwards`
                          : `neonLetterOn 0.5s ease-in ${delays[i] * 0.6}s both`,
                      }}>{ch}</span>
                    ))}
                  </div>
                  {/* Bottom row: SCHAFT */}
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    {letters.slice(6).map((ch, i) => (
                      <span key={i + 6} style={{
                        ...letterStyle, fontSize,
                        animation: isOpen
                          ? `neonLetterOff 0.6s ease-out ${delays[i + 6]}s forwards`
                          : `neonLetterOn 0.5s ease-in ${delays[i + 6] * 0.6}s both`,
                      }}>{ch}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </button>

      </div>

      {/* Satellite buttons — rotating orbit */}
      {!isOpen && (() => {
        const orbitR = actualSize / 2 + Math.max(28, Math.round(actualSize * 0.28))
        const satSize = Math.max(44, Math.round(actualSize * 0.26))
        return (
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 0, height: 0, pointerEvents: 'none',
            animation: 'hubSpin 50s linear infinite',
          }}>
            <button
              onClick={e => { e.stopPropagation(); if (!scanning) onScan() }}
              disabled={scanning}
              style={{
                position: 'absolute',
                left: -orbitR - satSize / 2, top: -satSize / 2,
                width: satSize, height: satSize, borderRadius: '50%',
                border: `1.5px solid ${rgba(gold, 0.60)}`,
                background: rgba(T.bg, 0.92),


                color: rgba(gold, 0.92),
                fontSize: 9, fontWeight: 600,
                cursor: scanning ? 'wait' : 'pointer',
                opacity: scanning ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 20px rgba(0,0,0,0.5), 0 0 12px ${rgba(gold, 0.12)}`,
                pointerEvents: 'auto',
                animation: scanning
                  ? 'hubSpin 50s linear infinite reverse, pulse 1.5s ease infinite'
                  : 'hubSpin 50s linear infinite reverse',
              }}
              className="hub-sat-btn"
              aria-label="AI 추천 스캔"
            >{scanning ? '분석중...' : 'AI 분석'}</button>
          </div>
        )
      })()}
    </div>
  )
})
