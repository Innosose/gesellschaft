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
              inset: -28,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rgba(hubColor, 0.28)} 0%, ${rgba(hubColor, 0.08)} 50%, transparent 70%)`,
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
            border: `${isOpen ? 1.5 : 2.5}px solid ${rgba(hubColor, isOpen ? 0.50 : 0.75)}`,
            background: isOpen
              ? `radial-gradient(circle at 40% 35%, ${rgba(hubColor, 0.15)}, rgba(10,8,22,0.88))`
              : `radial-gradient(circle at 40% 35%, ${rgba(hubColor, 0.42)}, rgba(10,8,22,0.96))`,
            boxShadow: isOpen
              ? `0 0 22px ${rgba(hubColor, 0.25)}`
              : `0 0 55px ${rgba(hubColor, 0.55)}, 0 0 18px ${rgba(hubColor, 0.3)}, inset 0 1px 0 rgba(255,255,255,0.1)`,
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
                color: rgba(hubColor, 0.85),
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

        {/* Recommendation badge — shows as count dot in hub state, pill in menu state */}
        {recommendedCount > 0 && !isOpen && (
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
        {recommendedCount > 0 && isOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontSize: 10,
              fontWeight: 600,
              color: '#fbbf24',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: 10,
              padding: '2px 8px',
              animation: 'fadeIn 0.2s ease both',
              pointerEvents: 'none',
            }}
          >
            ✦ AI 추천 {recommendedCount}개
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
            className="hub-scan-btn"
            style={{
              '--hub-scan-bg':           rgba(hubColor, 0.1),
              '--hub-scan-bg-hover':     rgba(hubColor, 0.22),
              '--hub-scan-border':       rgba(hubColor, 0.4),
              '--hub-scan-border-hover': rgba(hubColor, 0.7),
              '--hub-scan-color':        rgba(hubColor, 0.9),
              cursor: scanning ? 'wait' : 'pointer',
              opacity: scanning ? 0.6 : 1,
            } as React.CSSProperties}
          >
            {scanning ? '⟳ 분석중...' : '✦ AI 추천'}
          </button>

          <button
            onClick={onHide}
            title="숨기기 (Ctrl+Shift+G)"
            className="hub-hide-btn"
          >
            숨기기
          </button>
        </div>
      )}
    </div>
  )
}
