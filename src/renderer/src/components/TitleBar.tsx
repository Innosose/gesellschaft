import React, { useEffect, useState } from 'react'

function DayNightToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }): React.ReactElement {
  const isNight = isDark
  return (
    <button
      className="day-night-toggle"
      onClick={onToggle}
      title={isNight ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <div className={`toggle-track ${isNight ? 'night' : 'day'}`}>
        {/* Stars */}
        <div className={`toggle-stars ${isNight ? 'visible' : 'hidden'}`}>
          <div className="star" style={{ width: 2, height: 2, top: 5, left: 8, animationDelay: '0s' }} />
          <div className="star" style={{ width: 1.5, height: 1.5, top: 9, left: 14, animationDelay: '0.4s' }} />
          <div className="star" style={{ width: 1.5, height: 1.5, top: 4, left: 20, animationDelay: '0.8s' }} />
          <div className="star" style={{ width: 2, height: 2, top: 14, left: 10, animationDelay: '1.2s' }} />
        </div>

        {/* Cloud shapes */}
        <div className={`toggle-clouds ${isNight ? 'hidden' : 'visible'}`}>
          <svg width="52" height="26" viewBox="0 0 52 26" fill="none">
            <ellipse cx="38" cy="18" rx="7" ry="4" fill="rgba(255,255,255,0.6)" />
            <ellipse cx="34" cy="16" rx="5" ry="4" fill="rgba(255,255,255,0.7)" />
            <ellipse cx="42" cy="17" rx="4" ry="3" fill="rgba(255,255,255,0.5)" />
          </svg>
        </div>

        {/* Sliding knob */}
        <div className={`toggle-knob ${isNight ? 'night' : 'day'}`}>
          {isNight ? (
            /* Moon crescent */
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 6.5A4.5 4.5 0 0 1 5.5 11 4.5 4.5 0 0 1 1 6.5 4.5 4.5 0 0 1 5.5 2a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 4.5-2.5z"
                fill="#3a3a6e"
                opacity="0.9"
              />
            </svg>
          ) : (
            /* Sun */
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.8" fill="#e65c00" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180
                const x1 = 6 + Math.cos(rad) * 4
                const y1 = 6 + Math.sin(rad) * 4
                const x2 = 6 + Math.cos(rad) * 5.4
                const y2 = 6 + Math.sin(rad) * 5.4
                return (
                  <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#e65c00" strokeWidth="1" strokeLinecap="round" />
                )
              })}
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

export default function TitleBar({
  isDark,
  onToggleTheme,
  onOpenAi,
}: {
  isDark: boolean
  onToggleTheme: () => void
  onOpenAi?: () => void
}): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    window.api.window.onMaximized(setIsMaximized)
  }, [])

  return (
    <div className="titlebar flex-shrink-0 drag-region" style={{ borderBottom: '1px solid var(--win-border)' }}>
      <div className="accent-line" />

      <div className="flex items-center h-8">
        {/* App icon + title */}
        <div className="flex items-center gap-2 px-3 no-drag">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="11" rx="2" fill="#0078d4" opacity="0.9"/>
            <path d="M1 6h14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
            <rect x="3" y="8" width="4" height="3" rx="0.5" fill="rgba(255,255,255,0.7)"/>
            <rect x="9" y="8" width="4" height="1.2" rx="0.5" fill="rgba(255,255,255,0.4)"/>
            <rect x="9" y="10" width="2.5" height="1.2" rx="0.5" fill="rgba(255,255,255,0.4)"/>
          </svg>
          <span className="titlebar-text-main text-[13px] font-semibold tracking-tight" style={{ color: 'var(--win-text)' }}>게젤샤프트</span>
          <span className="titlebar-text-sub text-[11px] font-normal" style={{ color: 'var(--win-text-muted)' }}>업무 보조 도구</span>
        </div>

        <div className="flex-1" />

        {/* AI button */}
        {onOpenAi && (
          <div className="no-drag flex items-center mr-1">
            <button
              onClick={onOpenAi}
              title="AI 어시스턴트 (Ctrl+Space)"
              style={{
                height: 22, padding: '0 10px', borderRadius: 4, border: '1px solid var(--win-border)',
                background: 'var(--win-surface-2)', color: 'var(--win-text-sub)',
                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--win-surface-3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--win-surface-2)' }}
            >
              🤖 <span>AI</span>
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <div className="no-drag flex items-center mr-2">
          <DayNightToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>

        {/* Window controls */}
        <div className="flex no-drag h-full">
          {[
            {
              title: '최소화',
              onClick: () => window.api.window.minimize(),
              icon: <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
            },
            {
              title: isMaximized ? '원래 크기로' : '최대화',
              onClick: () => window.api.window.maximize(),
              icon: isMaximized
                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="0" width="8" height="8"/><path d="M0 2L0 10L8 10"/></svg>
                : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
            }
          ].map((btn, i) => (
            <button
              key={i}
              className="titlebar-win-btn w-11 h-full flex items-center justify-center transition-colors duration-100"
              style={{ background: 'transparent', color: 'var(--win-text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--win-surface-3)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              onClick={btn.onClick}
              title={btn.title}
            >
              {btn.icon}
            </button>
          ))}

          <button
            className="titlebar-win-btn close-btn w-11 h-full flex items-center justify-center transition-colors duration-100"
            style={{ background: 'transparent', color: 'var(--win-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--win-danger)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
            onClick={() => window.api.window.close()}
            title="닫기"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
