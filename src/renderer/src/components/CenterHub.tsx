import React from 'react'
import { rgba } from '../utils/color'

interface CenterHubProps {
  isOpen: boolean
  scanning: boolean
  recommendedCount: number
  hubColor: string
  hubSize: number
  onClick: () => void
  onScan: () => void
  onHide: () => void
}

function BookIcon({ size, color }: { size: number; color: string }): React.ReactElement {
  const s = size * 0.55
  return (
    <svg width={s} height={s * 0.82} viewBox="0 0 50 41" fill="none" style={{ flexShrink: 0 }}>
      {/* Left page */}
      <path
        d="M25 4 C19 4 9 6.5 3 10.5 L3 36 C9 33 19 32 25 33 Z"
        fill={`${color}28`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Right page */}
      <path
        d="M25 4 C31 4 41 6.5 47 10.5 L47 36 C41 33 31 32 25 33 Z"
        fill={`${color}18`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Spine */}
      <line x1="25" y1="4" x2="25" y2="33" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Left page lines */}
      <line x1="7" y1="16" x2="21" y2="15" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="7" y1="21.5" x2="21" y2="20.5" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="7" y1="27" x2="21" y2="26" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
      {/* Right page lines */}
      <line x1="29" y1="15" x2="43" y2="16" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="29" y1="20.5" x2="43" y2="21.5" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="29" y1="26" x2="43" y2="27" stroke={color} strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
    </svg>
  )
}

export default function CenterHub({
  isOpen,
  scanning,
  recommendedCount,
  hubColor,
  hubSize,
  onClick,
  onScan,
  onHide,
}: CenterHubProps): React.ReactElement {
  // When open: move to top of screen and shrink
  const openScale = 0.72
  const actualSize = isOpen ? hubSize * openScale : hubSize

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: isOpen ? '9%' : '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isOpen ? 12 : 20,
        pointerEvents: 'none',
        transition: 'top 0.42s cubic-bezier(0.34,1.15,0.64,1)',
      }}
    >
      {/* Hub button */}
      <div style={{ position: 'relative', pointerEvents: 'auto' }}>
        {/* Outer glow — only in hub (closed) state */}
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              inset: -22,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rgba(hubColor, 0.13)} 0%, transparent 70%)`,
              animation: 'hubGlow 3s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        <button
          onClick={onClick}
          title={isOpen ? '메뉴 닫기 (Esc)' : '메뉴 열기'}
          style={{
            position: 'relative',
            width: actualSize,
            height: actualSize,
            borderRadius: '50%',
            border: `${isOpen ? 1.5 : 2}px solid ${rgba(hubColor, isOpen ? 0.45 : 0.55)}`,
            background: isOpen
              ? `radial-gradient(circle at 40% 35%, ${rgba(hubColor, 0.12)}, rgba(10,8,22,0.88))`
              : `radial-gradient(circle at 40% 35%, ${rgba(hubColor, 0.24)}, rgba(10,8,22,0.96))`,
            boxShadow: isOpen
              ? `0 0 20px ${rgba(hubColor, 0.2)}`
              : `0 0 45px ${rgba(hubColor, 0.3)}, inset 0 1px 0 rgba(255,255,255,0.07)`,
            cursor: 'pointer',
            transition: 'all 0.42s cubic-bezier(0.34,1.15,0.64,1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <BookIcon size={actualSize} color={isOpen ? rgba(hubColor, 0.7) : hubColor} />

          {/* App name — only when hub is closed */}
          {!isOpen && (
            <span
              style={{
                fontSize: Math.max(6, Math.round(hubSize * 0.058)),
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: rgba(hubColor, 0.6),
                textTransform: 'uppercase',
                userSelect: 'none',
                marginLeft: '0.18em',
              }}
            >
              게젤샤프트
            </span>
          )}

          {/* Rotating ring when open */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                border: `1px dashed ${rgba(hubColor, 0.35)}`,
                animation: 'hubSpin 10s linear infinite',
              }}
            />
          )}
        </button>

        {/* Recommendation badge */}
        {recommendedCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: '2px solid rgba(8,6,20,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: 'white',
              animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {recommendedCount}
          </div>
        )}
      </div>

      {/* Action buttons — only when menu is CLOSED (hub state) */}
      {!isOpen && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.35s ease 0.15s both',
          }}
        >
          <button
            onClick={onScan}
            disabled={scanning}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${rgba(hubColor, 0.4)}`,
              background: rgba(hubColor, 0.1),
              color: rgba(hubColor, 0.9),
              fontSize: 11,
              fontWeight: 600,
              cursor: scanning ? 'wait' : 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
              letterSpacing: '0.02em',
              opacity: scanning ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!scanning) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = rgba(hubColor, 0.22)
                el.style.borderColor = rgba(hubColor, 0.7)
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = rgba(hubColor, 0.1)
              el.style.borderColor = rgba(hubColor, 0.4)
            }}
          >
            {scanning ? '⟳ 분석중...' : '✦ AI 추천'}
          </button>

          <button
            onClick={onHide}
            title="숨기기 (Ctrl+Shift+G)"
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(255,255,255,0.1)'
              el.style.color = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'rgba(255,255,255,0.05)'
              el.style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            숨기기
          </button>
        </div>
      )}
    </div>
  )
}
