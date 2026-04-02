import React, { memo, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import CenterHub from './components/CenterHub'
import SpiralMenu from './components/SpiralMenu'
import ToolPanel from './components/ToolPanel'
import RecommendOverlay from './components/RecommendOverlay'
import { useAppStore } from './store/appStore'
import { ALL_TOOLS } from '../../shared/constants'
import { loadSavedTheme, T, rgba, useTheme, PARTICLE_CONFIGS } from './utils/theme'

interface Tool { id: string; icon: string; label: string; color: string }
type UIState = 'hub' | 'menu' | 'tool'
interface Notification { id: number; message: string; type: 'info' | 'error' | 'success' }

let notifIdCounter = 0

const NC: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  info:    { bg: 'rgba(14,12,8,0.97)', border: rgba(T.gold, 0.3), color: 'rgba(220,200,160,0.9)', dot: T.gold },
  error:   { bg: 'rgba(20,10,10,0.96)', border: 'rgba(224,84,104,0.2)', color: 'rgba(255,160,175,0.9)', dot: '#e05468' },
  success: { bg: 'rgba(10,18,16,0.96)', border: rgba(T.teal, 0.2), color: 'rgba(140,230,200,0.9)', dot: T.teal },
}

/** Particle seed data — stable across renders */
const PARTICLE_SEEDS = [
  { left: '10%', bottom: '5%', size: 8, dur: '8s', delay: '0s', anim: 1 },
  { left: '25%', bottom: '10%', size: 6, dur: '10s', delay: '1.5s', anim: 2 },
  { left: '45%', bottom: '0%', size: 10, dur: '9s', delay: '0.8s', anim: 3 },
  { left: '65%', bottom: '8%', size: 7, dur: '11s', delay: '2.2s', anim: 1 },
  { left: '80%', bottom: '3%', size: 9, dur: '8.5s', delay: '0.3s', anim: 2 },
  { left: '15%', bottom: '15%', size: 5, dur: '12s', delay: '3s', anim: 3 },
  { left: '55%', bottom: '12%', size: 8, dur: '9.5s', delay: '1s', anim: 1 },
  { left: '90%', bottom: '6%', size: 6, dur: '10.5s', delay: '2.8s', anim: 2 },
  { left: '35%', bottom: '2%', size: 7, dur: '7.5s', delay: '0.5s', anim: 3 },
  { left: '72%', bottom: '18%', size: 5, dur: '13s', delay: '3.5s', anim: 1 },
  { left: '5%', bottom: '20%', size: 6, dur: '11.5s', delay: '1.8s', anim: 2 },
  { left: '48%', bottom: '16%', size: 4, dur: '14s', delay: '4s', anim: 3 },
  { left: '85%', bottom: '12%', size: 7, dur: '9s', delay: '0.6s', anim: 1 },
  { left: '30%', bottom: '8%', size: 5, dur: '12.5s', delay: '2.5s', anim: 2 },
  { left: '60%', bottom: '22%', size: 4, dur: '15s', delay: '3.8s', anim: 3 },
  { left: '95%', bottom: '15%', size: 6, dur: '10s', delay: '1.2s', anim: 1 },
] as const

const PARTICLE_CONTAINER_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 11, overflow: 'hidden',
}

/** Memoized particle layer — only re-renders when theme identity changes */
const Particles = memo(function Particles({ theme }: {
  theme: { id: string; particle: string; particleCount: number; particleColor: string }
}) {
  const pc = PARTICLE_CONFIGS[theme.particle]
  return (
    <div aria-hidden="true" style={PARTICLE_CONTAINER_STYLE}>
      {PARTICLE_SEEDS.slice(0, theme.particleCount).map((p, i) => (
        <div key={`${theme.id}-p${i}`} style={{
          position: 'absolute', left: p.left, bottom: p.bottom,
          width: pc.width(p.size), height: pc.height(p.size),
          background: theme.particleColor,
          borderRadius: pc.borderRadius,
          transform: `rotate(${pc.rotate}deg)`,
          animation: `${pc.animation}${p.anim} ${p.dur} ease-in-out ${p.delay} infinite`,
          filter: pc.blur > 0 ? `blur(${pc.blur}px)` : undefined,
        }} />
      ))}
    </div>
  )
})

/** True when running in a normal browser (not Electron) */
const isWeb = !('__electron__' in window || navigator.userAgent.includes('Electron'))

export default function App(): React.ReactElement {
  const { hubColor, hubSize, overlayOpacity, spiralScale, animSpeed, autoScan, loadFromAPI } = useAppStore()
  const theme = useTheme() // re-render entire app on theme change
  const [uiState, setUiState] = useState<UIState>('hub')
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [recommended, setRecommended] = useState<string[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const recommendClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scanning, setScanning] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [dismissing, setDismissing] = useState<Set<number>>(new Set())
  const dismissTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => { loadFromAPI(); loadSavedTheme() }, [loadFromAPI])

  const removeNotification = useCallback((id: number) => {
    setDismissing(prev => { const next = new Set(prev); next.add(id); return next })
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      setDismissing(prev => { const next = new Set(prev); next.delete(id); return next })
    }, 200)
  }, [])

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = ++notifIdCounter
    setNotifications(prev => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      removeNotification(id)
      dismissTimers.current.delete(id)
    }, 4000)
    dismissTimers.current.set(id, timer)
  }, [removeNotification])

  const dismissNotification = useCallback((id: number) => {
    const timer = dismissTimers.current.get(id)
    if (timer) { clearTimeout(timer); dismissTimers.current.delete(id) }
    removeNotification(id)
  }, [removeNotification])

  useEffect(() => () => {
    dismissTimers.current.forEach(t => clearTimeout(t))
    if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
  }, [])

  const handleToolSelect = useCallback((id: string) => {
    const tool = ALL_TOOLS.find(t => t.id === id) ?? null
    setActiveTool(tool); setUiState('tool')
    if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
    setRecommended([]); setReasons({})
  }, [])

  const handleBack = useCallback(() => { setActiveTool(null); setUiState('menu'); setToolSearch('') }, [])

  const handleScan = useCallback(async () => {
    if (isWeb) { addNotification('화면 분석은 데스크톱 앱에서만 사용 가능합니다.', 'info'); return }
    setScanning(true)
    try {
      const result = await window.api.screen.captureAndAnalyze()
      if (result.success) {
        setRecommended(result.recommendations); setReasons(result.reasons ?? {})
        if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
        recommendClearTimer.current = setTimeout(() => { setRecommended([]); setReasons({}) }, 300_000)
        setUiState('menu')
        if (result.recommendations.length > 0) {
          setShowRecommend(true)
        } else {
          addNotification('추천 기능을 찾지 못했습니다.', 'info')
        }
      } else {
        setUiState('menu')
        addNotification(result.error?.includes('API 키') ? '설정에서 API 키를 등록해주세요.' : `분석 실패: ${result.error ?? '오류'}`, 'error')
      }
    } catch { addNotification('분석 중 오류가 발생했습니다.', 'error') }
    finally { setScanning(false) }
  }, [addNotification])

  const handleHubClick = useCallback(() => {
    if (uiState === 'hub') {
      setUiState('menu')
      if (autoScan && recommended.length === 0 && !scanning) {
        handleScan()
      }
    } else if (uiState === 'menu') {
      setToolSearch(''); setUiState('hub')
    }
  }, [uiState, autoScan, recommended.length, scanning, handleScan])

  const handleHide = useCallback(() => { if (isWeb) setUiState('hub'); else window.api.window.hide() }, [])
  const handleOpenSettings = useCallback(() => {
    setActiveTool({ id: 'settings', icon: '', label: '설정', color: T.gold }); setUiState('tool')
  }, [])
  const handleBackdropClick = useCallback(() => setUiState(s => s === 'menu' ? 'hub' : s), [])
  const handleMenuSelect = useCallback((id: string) => { setToolSearch(''); handleToolSelect(id) }, [handleToolSelect])

  useEffect(() => {
    // Click-through is an Electron-only feature (frameless transparent window)
    if (isWeb) return
    if (uiState !== 'hub') { window.api.window.setIgnoreMouseEvents(false); return }
    window.api.window.setIgnoreMouseEvents(true, { forward: true })
    let lastCall = 0, lastHit = false
    const onMove = (e: MouseEvent): void => {
      const now = Date.now(); if (now - lastCall < 16) return; lastCall = now
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const hit = el?.closest('button, input, a, [data-interactive]') != null
      if (hit !== lastHit) { lastHit = hit; window.api.window.setIgnoreMouseEvents(!hit, { forward: true }) }
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); window.api.window.setIgnoreMouseEvents(false) }
  }, [uiState])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return }
        if (uiState === 'tool') handleBack()
        else if (uiState === 'menu') { setToolSearch(''); setUiState('hub') }
      }
      if (e.key === '?' && uiState !== 'tool') setShowShortcuts(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uiState, handleBack, showShortcuts])

  return (
    <div role="application" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden',
      fontFamily: "'Pretendard', 'Segoe UI Variable', system-ui, sans-serif",
      background: isWeb ? '#0a0804' : undefined }}>

      <a href="#main-content" style={{
        position: 'absolute', left: '-9999px', top: 'auto',
        width: '1px', height: '1px', overflow: 'hidden',
        zIndex: 9999,
      }} onFocus={e => { e.currentTarget.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9999;padding:8px 16px;border-radius:6px;background:var(--win-accent);color:#fff;font-size:13px;font-weight:600;outline:none;' }}
         onBlur={e => { e.currentTarget.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;' }}
      >메인 콘텐츠로 건너뛰기</a>

      {/* Live region for tool selection announcements */}
      <div aria-live="assertive" style={{ position: 'absolute', left: '-9999px' }}>{activeTool ? `${activeTool.label} 도구가 열렸습니다` : ''}</div>
      <div id="gs-sr-announce" role="status" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} />

      <div className={`app-backdrop ${uiState !== 'hub' ? 'active' : ''}`}
        style={uiState !== 'hub' ? {
          background: `${theme.bg}e0`,
          backdropFilter: `blur(${theme.blurStrength}px) saturate(1.3) brightness(${theme.brightness})`,
          WebkitBackdropFilter: `blur(${theme.blurStrength}px) saturate(1.3) brightness(${theme.brightness})`,
        } : undefined}
        onClick={handleBackdropClick} />

      {/* Floating particles — theme-driven, memoized to avoid re-renders from App state */}
      {uiState === 'menu' && <Particles theme={theme} />}

      {uiState !== 'tool' && (
        <CenterHub key={theme.id} isOpen={uiState === 'menu'} scanning={scanning}
          hubColor={hubColor} hubSize={hubSize}
          onClick={handleHubClick} onScan={handleScan} />
      )}

      {uiState === 'menu' && (
        <SpiralMenu tools={ALL_TOOLS}
          spiralScale={spiralScale} animSpeed={animSpeed} filterQuery={toolSearch}
          onSelectTool={handleMenuSelect} />
      )}

      {/* Search */}
      {uiState === 'menu' && (
        <div style={{ position: 'fixed', left: '50%', bottom: 'clamp(12px, 3vh, 50px)', transform: 'translateX(-50%)',
          zIndex: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          pointerEvents: 'none', animation: 'slideUp 0.3s cubic-bezier(0.25,1,0.5,1) 0.12s both',
          width: 'min(92vw, 400px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div style={{ position: 'relative', pointerEvents: 'auto', width: '100%' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5.5" stroke={T.fg} strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke={T.fg} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input autoFocus value={toolSearch} onChange={e => setToolSearch(e.target.value)}
              aria-label="도구 검색" placeholder="검색" style={{
                width: '100%', padding: '10px 40px 10px 36px', borderRadius: 10,
                border: 'none',
                background: rgba(T.fg, 0.1), color: rgba(T.fg, 0.9),
                fontSize: 17, fontWeight: 400, backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                outline: 'none',
                transition: 'background 0.15s ease', minHeight: 36,
                letterSpacing: '-0.02em',
              }} />
            {toolSearch && (
              <button onClick={() => setToolSearch('')} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: rgba(T.fg, 0.15), border: 'none', color: rgba(T.fg, 0.4),
                cursor: 'pointer', fontSize: 10, lineHeight: 1, padding: 0,
                width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            )}
          </div>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Core', 'Overlay', 'Quick Use', 'Schedule', 'Documents', 'System'].map(cat => (
              <button key={cat} onClick={() => setToolSearch(toolSearch === cat ? '' : cat)}
                style={{
                  fontSize: 13, padding: '6px 14px', borderRadius: 100, cursor: 'pointer',
                  border: 'none',
                  background: toolSearch === cat ? rgba(T.teal, 0.2) : rgba(T.fg, 0.08),
                  color: toolSearch === cat ? T.teal : rgba(T.fg, 0.6),
                  fontWeight: 500, transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)', minHeight: 32, letterSpacing: '-0.01em',
                }}>{cat}</button>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendation overlay */}
      {showRecommend && recommended.length > 0 && (
        <RecommendOverlay
          recommendations={recommended}
          reasons={reasons}
          onSelect={(id) => { setShowRecommend(false); setRecommended([]); setReasons({}); handleMenuSelect(id) }}
          onDismiss={() => { setShowRecommend(false); setRecommended([]); setReasons({}) }}
        />
      )}

      {/* Notifications */}
      <div aria-live="polite" style={{ position: 'fixed', top: 'max(clamp(48px, 6vh, 64px), env(safe-area-inset-top, 48px))',
        left: '50%', transform: 'translateX(-50%)', zIndex: 300,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none', width: 'min(92vw, 380px)' }}>
        {notifications.map(n => {
          const c = NC[n.type]
          const isDismissing = dismissing.has(n.id)
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '12px 14px', borderRadius: 14,
              background: rgba(T.fg, 0.08),
              backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              color: rgba(T.fg, 0.9),
              fontSize: 15, fontWeight: 400,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              pointerEvents: 'auto',
              animation: isDismissing ? 'slideOutUp 0.25s cubic-bezier(0.32,0,0.67,0) both' : 'slideInDown 0.35s cubic-bezier(0.32,0.72,0,1) both',
              lineHeight: 1.4,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, letterSpacing: '-0.01em' }}>{n.message}</span>
              <button onClick={() => dismissNotification(n.id)} style={{
                background: rgba(T.fg, 0.08), border: 'none', color: rgba(T.fg, 0.4),
                cursor: 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0,
                width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          )
        })}
      </div>

      {uiState === 'tool' && activeTool && (
        <div id="main-content" style={{ animation: 'toolPanelIn 0.2s ease both', position: 'fixed', inset: 0, zIndex: 50 }}>
          <ToolPanel key={activeTool.id} toolId={activeTool.id}
            toolColor={activeTool.color} toolLabel={activeTool.label} onBack={handleBack} />
        </div>
      )}

      {/* Top controls — hidden in hub state */}
      {uiState !== 'hub' && <>
      <button onClick={handleOpenSettings} title="설정"
        style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top, 12px))', right: 52, zIndex: 100,
          width: 34, height: 34, borderRadius: 17, border: 'none',
          background: rgba(T.fg, 0.1), backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          color: rgba(T.fg, 0.5), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease', transition: 'background 0.15s',
        }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"/>
        </svg>
      </button>
      <button onClick={handleHide} title={isWeb ? '메뉴 닫기' : '숨기기'}
        style={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top, 12px))', right: 12, zIndex: 100,
          width: 34, height: 34, borderRadius: 17, border: 'none',
          background: rgba(T.fg, 0.1), backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          color: rgba(T.fg, 0.5), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease', transition: 'background 0.15s',
        }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
        </svg>
      </button>
      </>}

      {/* Portal mount point for fullscreen overlay tools */}
      <div id="overlay-portal" style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }} />

      {/* Keyboard shortcut help overlay */}
      {showShortcuts && (
        <div onClick={() => setShowShortcuts(false)} style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: rgba(T.bg, 0.9), backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{ padding: 'clamp(20px, 5vw, 28px)', borderRadius: 16, border: 'none', background: rgba(T.fg, 0.06), minWidth: 340, maxWidth: 440, backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: rgba(T.fg, 0.95), marginBottom: 4, letterSpacing: '-0.02em' }}>키보드 단축키</div>
            <div style={{ fontSize: 13, color: rgba(T.fg, 0.35), marginBottom: 20 }}>아무 곳이나 클릭하거나 Esc를 눌러 닫기</div>

            {([
              { label: '일반', items: [
                ['Esc', '닫기 / 뒤로가기'],
                ['?', '이 도움말 표시'],
              ]},
              { label: '메뉴 탐색', items: [
                ['←  →', '이전 / 다음 도구'],
                ['Home', '첫 번째 도구 (A)'],
                ['End', '마지막 도구 (Z)'],
                ['↑  ↓', '전체 보기 토글'],
                ['Enter', '선택한 도구 열기'],
                ['스크롤', '도구 회전'],
              ]},
              { label: '검색', items: [
                ['텍스트 입력', '도구 이름으로 필터'],
                ['카테고리 클릭', '분류별 필터'],
              ]},
            ] as const).map(section => (
              <div key={section.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: rgba(T.fg, 0.35), marginBottom: 6, paddingLeft: 16, textTransform: 'uppercase' }}>{section.label}</div>
                <div style={{ background: rgba(T.fg, 0.06), borderRadius: 10, overflow: 'hidden' }}>
                {section.items.map(([key, desc], i) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', minHeight: 44, borderBottom: i < section.items.length - 1 ? `0.5px solid ${rgba(T.fg, 0.08)}` : 'none' }}>
                    <kbd style={{ fontSize: 12, fontWeight: 600, color: rgba(T.fg, 0.6), fontFamily: 'ui-monospace, "SF Mono", monospace', background: rgba(T.fg, 0.06), padding: '3px 10px', borderRadius: 6, border: 'none', minWidth: 52, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{key}</kbd>
                    <span style={{ fontSize: 15, color: rgba(T.fg, 0.6), letterSpacing: '-0.01em' }}>{desc}</span>
                  </div>
                ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
