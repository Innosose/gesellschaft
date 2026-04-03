import React, { useEffect, useState, useCallback, useRef } from 'react'
import CenterHub from './components/CenterHub'
import SpiralMenu from './components/SpiralMenu'
import ToolPanel from './components/ToolPanel'
import RecommendOverlay from './components/RecommendOverlay'
import { useAppStore } from './store/appStore'
import { ALL_TOOLS } from '../../shared/constants'
import { loadSavedTheme, T, rgba, useTheme } from './utils/theme'

interface Tool { id: string; icon: string; label: string; color: string }
type UIState = 'hub' | 'menu' | 'tool'
interface Notification { id: number; message: string; type: 'info' | 'error' | 'success' }

let notifIdCounter = 0

const NC: Record<string, { dot: string }> = {
  info:    { dot: T.gold },
  error:   { dot: '#e05468' },
  success: { dot: T.teal },
}


export default function App(): React.ReactElement {
  const { hubColor, hubSize, spiralScale, animSpeed, autoScan, loadFromAPI } = useAppStore()
  const theme = useTheme()
  const [uiState, setUiState] = useState<UIState>('hub')
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [recommended, setRecommended] = useState<string[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const recommendClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scanning, setScanning] = useState(false)
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

  const handleBack = useCallback(() => { setActiveTool(null); setUiState('menu') }, [])

  const handleScan = useCallback(async () => {
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
      setUiState('hub')
    }
  }, [uiState, autoScan, recommended.length, scanning, handleScan])

  const handleBackdropClick = useCallback(() => setUiState(s => s === 'menu' ? 'hub' : s), [])
  const handleMenuSelect = useCallback((id: string) => { handleToolSelect(id) }, [handleToolSelect])

  useEffect(() => {
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
        else if (uiState === 'menu') { setUiState('hub') }
      }
      if (e.key === '?' && uiState !== 'tool') setShowShortcuts(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uiState, handleBack, showShortcuts])

  return (
    <div role="application" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden',
      background: undefined }}>

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
            backdropFilter: `blur(${theme.blurStrength}px) saturate(1.8) brightness(${theme.brightness})`,
            WebkitBackdropFilter: `blur(${theme.blurStrength}px) saturate(1.8) brightness(${theme.brightness})`,
          } : undefined}
          onClick={handleBackdropClick} />

      {uiState !== 'tool' && (
        <CenterHub key={theme.id} isOpen={uiState === 'menu'} scanning={scanning}
          hubColor={hubColor} hubSize={hubSize}
          onClick={handleHubClick} onScan={handleScan} />
      )}

      {uiState === 'menu' && (
        <SpiralMenu tools={ALL_TOOLS}
          spiralScale={spiralScale} animSpeed={animSpeed}
          onSelectTool={handleMenuSelect} onClose={() => setUiState('hub')} />
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

      {/* Notifications — iOS banner style */}
      <div aria-live="polite" style={{ position: 'fixed', top: 48,
        left: '50%', transform: 'translateX(-50%)', zIndex: 300,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none', width: 360 }}>
        {notifications.map(n => {
          const c = NC[n.type]
          const isDismissing = dismissing.has(n.id)
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '12px 16px', borderRadius: 12,
              background: '#1c1c1e',
              borderLeft: `3px solid ${c.dot}`,
              color: 'rgba(255,255,255,0.92)',
              fontSize: 15, fontWeight: 400,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
              animation: isDismissing ? 'slideOutUp 0.25s cubic-bezier(0.32,0,0.67,0) both' : 'slideInDown 0.35s cubic-bezier(0.32,0.72,0,1) both',
              lineHeight: 1.33, letterSpacing: '-0.41px',
            }}>
              <span style={{ flex: 1 }}>{n.message}</span>
              <button onClick={() => dismissNotification(n.id)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)',
                cursor: 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0,
                width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44,
              }}>✕</button>
            </div>
          )
        })}
      </div>

      {uiState === 'tool' && activeTool && (
        <div id="main-content" style={{ animation: 'toolPanelIn 0.3s cubic-bezier(0.32,0.72,0,1) both', position: 'fixed', inset: 0, zIndex: 150 }}>
          <ToolPanel key={activeTool.id} toolId={activeTool.id}
            toolColor={activeTool.color} toolLabel={activeTool.label} onBack={handleBack}
            tools={ALL_TOOLS} onSelectTool={handleMenuSelect} />
        </div>
      )}

      {/* Portal mount point for fullscreen overlay tools */}
      <div id="overlay-portal" style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }} />

      {/* Keyboard shortcut help overlay */}
      {showShortcuts && (
        <div onClick={() => setShowShortcuts(false)} style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            padding: 24, borderRadius: 16, border: 'none',
            background: '#1c1c1e',
            minWidth: 340, maxWidth: 440,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 4, letterSpacing: '0.35px', lineHeight: 1.27 }}>키보드 단축키</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.38, textTransform: 'uppercase' }}>아무 곳이나 클릭하거나 Esc를 눌러 닫기</div>

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
                <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginBottom: 8, paddingLeft: 16, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.38 }}>{section.label}</div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                {section.items.map((item, i) => { const key = item[0], desc = item[1]; return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', minHeight: 44, borderBottom: i < section.items.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <kbd style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.60)', fontFamily: 'ui-monospace, "SF Mono", monospace', background: 'rgba(255,255,255,0.10)', padding: '4px 12px', borderRadius: 6, border: 'none', minWidth: 52, textAlign: 'center', lineHeight: 1.33 }}>{key}</kbd>
                    <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.60)', letterSpacing: '-0.41px', lineHeight: 1.33 }}>{desc}</span>
                  </div>
                )})}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
