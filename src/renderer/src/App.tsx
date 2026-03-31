import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import CenterHub from './components/CenterHub'
import SpiralMenu from './components/SpiralMenu'
import ToolPanel from './components/ToolPanel'
import { useAppStore } from './store/appStore'
import { ALL_TOOLS } from '../../shared/constants'

interface Tool {
  id: string
  icon: string
  label: string
  color: string
}

type UIState = 'hub' | 'menu' | 'tool'

interface Notification {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
}

let notifIdCounter = 0

// 컴포넌트 밖 상수 — 매 렌더마다 재생성되지 않음
const NOTIF_COLORS: Record<'info' | 'error' | 'success', { bg: string; border: string; color: string; dot: string }> = {
  info:    { bg: 'rgba(18,14,34,0.97)',  border: 'rgba(139,92,246,0.45)',  color: 'rgba(196,181,253,0.95)', dot: '#8b5cf6' },
  error:   { bg: 'rgba(22,8,8,0.97)',    border: 'rgba(220,38,38,0.45)',   color: 'rgba(252,165,165,0.95)', dot: '#ef4444' },
  success: { bg: 'rgba(6,18,12,0.97)',   border: 'rgba(34,197,94,0.40)',   color: 'rgba(134,239,172,0.95)', dot: '#22c55e' },
}

export default function App(): React.ReactElement {
  const { hubColor, hubSize, overlayOpacity, spiralScale, animSpeed, loadFromAPI } = useAppStore()

  const [uiState, setUiState] = useState<UIState>('hub')
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [recommended, setRecommended] = useState<string[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const recommendClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scanning, setScanning] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dismissTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // 설정 초기 로드
  useEffect(() => { loadFromAPI() }, [loadFromAPI])

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = ++notifIdCounter
    setNotifications(prev => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      dismissTimers.current.delete(id)
    }, 4000)
    dismissTimers.current.set(id, timer)
  }, [])

  const dismissNotification = useCallback((id: number) => {
    const timer = dismissTimers.current.get(id)
    if (timer) { clearTimeout(timer); dismissTimers.current.delete(id) }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      dismissTimers.current.forEach(t => clearTimeout(t))
      if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
    }
  }, [])

  const handleHubClick = useCallback(() => {
    setUiState(s => (s === 'menu' ? 'hub' : 'menu'))
  }, [])

  const handleToolSelect = useCallback((id: string) => {
    const tool = ALL_TOOLS.find(t => t.id === id) ?? null
    setActiveTool(tool)
    setUiState('tool')
    // Clear AI recommendations once user picks a tool
    if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
    setRecommended([])
    setReasons({})
  }, [])

  const handleBack = useCallback(() => {
    setActiveTool(null)
    setUiState('menu')
    setToolSearch('')
  }, [])

  // Memoize hub color RGB components for search bar background
  const hubRgb = useMemo(() => ({
    r: parseInt(hubColor.slice(1, 3), 16),
    g: parseInt(hubColor.slice(3, 5), 16),
    b: parseInt(hubColor.slice(5, 7), 16),
  }), [hubColor])

  const handleScan = useCallback(async () => {
    setScanning(true)
    try {
      const result = await window.api.screen.captureAndAnalyze()
      if (result.success) {
        setRecommended(result.recommendations)
        setReasons(result.reasons ?? {})
        // Auto-clear recommendations after 60s
        if (recommendClearTimer.current) clearTimeout(recommendClearTimer.current)
        recommendClearTimer.current = setTimeout(() => {
          setRecommended([])
          setReasons({})
        }, 60_000)
        setUiState('menu')
        if (result.recommendations.length === 0) {
          addNotification('화면에서 추천 기능을 찾지 못했습니다.', 'info')
        } else {
          addNotification(`${result.recommendations.length}개 기능을 추천합니다.`, 'success')
        }
      } else {
        setUiState('menu')
        const msg = result.error?.includes('API 키')
          ? '⚙ 설정 > AI 탭에서 API 키를 등록해주세요.'
          : `분석 실패: ${result.error ?? '알 수 없는 오류'}`
        addNotification(msg, 'error')
      }
    } catch {
      addNotification('화면 분석 중 오류가 발생했습니다.', 'error')
    } finally {
      setScanning(false)
    }
  }, [addNotification])

  const handleHide = useCallback(() => {
    window.api.window.hide()
  }, [])

  const handleClose = useCallback(() => {
    window.api.window.close()
  }, [])

  const handleOpenSettings = useCallback(() => {
    setActiveTool({ id: 'settings', icon: '⚙', label: '설정', color: '#6366f1' })
    setUiState('tool')
  }, [])

  // functional setState로 uiState 의존성 제거
  const handleBackdropClick = useCallback(() => {
    setUiState(s => s === 'menu' ? 'hub' : s)
  }, [])

  const handleMenuSelect = useCallback((id: string) => {
    setToolSearch('')
    handleToolSelect(id)
  }, [handleToolSelect])

  // Click-through: hub 상태에서 배경 클릭이 다른 앱으로 통과되도록
  useEffect(() => {
    if (uiState !== 'hub') {
      window.api.window.setIgnoreMouseEvents(false)
      return
    }
    window.api.window.setIgnoreMouseEvents(true, { forward: true })
    let lastCall = 0
    let lastHit = false
    const onMove = (e: MouseEvent): void => {
      const now = Date.now()
      if (now - lastCall < 16) return
      lastCall = now
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const hit = el?.closest('button, input, a, [data-interactive]') != null
      if (hit !== lastHit) {
        lastHit = hit
        window.api.window.setIgnoreMouseEvents(!hit, { forward: true })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.api.window.setIgnoreMouseEvents(false)
    }
  }, [uiState])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (uiState === 'tool') { handleBack(); return }
        if (uiState === 'menu') { setToolSearch(''); setUiState('hub'); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uiState, handleBack])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Dark backdrop */}
      <div
        className={`app-backdrop ${uiState !== 'hub' ? 'active' : ''}`}
        style={uiState !== 'hub' ? { background: `rgba(8, 5, 18, ${Math.min(overlayOpacity + 0.04, 0.97)})` } : undefined}
        onClick={handleBackdropClick}
      />

      {/* Center Hub — visible in hub + menu states */}
      {uiState !== 'tool' && (
        <CenterHub
          isOpen={uiState === 'menu'}
          scanning={scanning}
          recommendedCount={recommended.length}
          hubColor={hubColor}
          hubSize={hubSize}
          onClick={handleHubClick}
          onScan={handleScan}
          onHide={handleHide}
        />
      )}

      {/* Spiral Menu */}
      {uiState === 'menu' && (
        <SpiralMenu
          tools={ALL_TOOLS}
          recommended={recommended}
          reasons={reasons}
          spiralScale={spiralScale}
          animSpeed={animSpeed}
          filterQuery={toolSearch}
          onSelectTool={handleMenuSelect}
        />
      )}

      {/* Search bar — bottom center when menu is open */}
      {uiState === 'menu' && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 36,
            transform: 'translateX(-50%)',
            zIndex: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'none',
            animation: 'slideUp 0.32s cubic-bezier(0.25,1,0.5,1) 0.15s both',
          }}
        >
          <div style={{ position: 'relative', pointerEvents: 'auto' }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: 'rgba(180,145,90,0.82)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              🔍
            </span>
            <input
              autoFocus
              value={toolSearch}
              onChange={e => setToolSearch(e.target.value)}
              placeholder="기능 검색..."
              style={{
                width: 210,
                padding: '10px 16px 10px 38px',
                borderRadius: 26,
                border: `1.5px solid ${toolSearch ? `${hubColor}99` : 'rgba(255,255,255,0.13)'}`,
                background: toolSearch
                  ? `rgba(${hubRgb.r},${hubRgb.g},${hubRgb.b},0.10)`
                  : 'rgba(10,8,22,0.75)',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 13,
                fontWeight: 500,
                backdropFilter: 'blur(16px)',
                outline: 'none',
                textAlign: 'left',
                transition: 'border-color 0.15s ease, background 0.15s ease',
                boxShadow: toolSearch ? `0 0 20px ${hubColor}33` : '0 4px 20px rgba(0,0,0,0.4)',
              }}
            />
            {toolSearch && (
              <button
                onClick={() => setToolSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(160,120,65,0.75)',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 2,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* AI 추천 버튼 */}
          <button
            className="app-scan-btn"
            onClick={handleScan}
            disabled={scanning}
            style={{
              '--hub-bg':           `${hubColor}14`,
              '--hub-bg-hover':     `${hubColor}28`,
              '--hub-border':       `${hubColor}66`,
              '--hub-border-hover': `${hubColor}cc`,
              '--hub-text':         `${hubColor}ee`,
              cursor: scanning ? 'wait' : 'pointer',
              opacity: scanning ? 0.6 : 1,
              pointerEvents: 'auto',
            } as React.CSSProperties}
          >
            {scanning ? '⟳ 분석중...' : '✦ AI 화면 분석'}
          </button>
        </div>
      )}

      {/* Notification stack — top right (8. 버튼과 겹치지 않도록 top 조정) */}
      <div
        style={{
          position: 'fixed',
          top: 52,
          right: 90,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {notifications.map(n => {
          const c = NOTIF_COLORS[n.type]
          return (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px 8px 10px',
                borderRadius: 10,
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                fontSize: 12,
                fontWeight: 500,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
                maxWidth: 280,
                pointerEvents: 'auto',
                animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1) both',
                letterSpacing: '0.01em',
                lineHeight: 1.4,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{n.message}</span>
              <button
                onClick={() => dismissNotification(n.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: c.color,
                  opacity: 0.45,
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '0 0 0 4px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        /* ── 공통 컨트롤 버튼 (설정·종료) ─────────────────────── */
        .app-ctrl-btn {
          width: 28px; height: 28px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.50);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          backdrop-filter: blur(4px);
        }
        .app-ctrl-btn--settings:hover {
          background: rgba(139,92,246,0.25);
          color: rgba(196,181,253,0.85);
          border-color: rgba(139,92,246,0.4);
        }
        .app-ctrl-btn--quit:hover {
          background: rgba(220,38,38,0.35);
          color: rgba(255,255,255,0.8);
          border-color: rgba(220,38,38,0.5);
        }

        /* ── AI 스캔 버튼 (hubColor 기반 CSS 커스텀 프로퍼티) ─── */
        .app-scan-btn {
          padding: 6px 16px; border-radius: 20px;
          border: 1px solid var(--hub-border);
          background: var(--hub-bg);
          color: var(--hub-text);
          font-size: 11px; font-weight: 600;
          backdrop-filter: blur(8px);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .app-scan-btn:hover:not(:disabled) {
          background: var(--hub-bg-hover);
          border-color: var(--hub-border-hover);
        }
      `}</style>

      {/* Tool Panel — 10. 전환 애니메이션 */}
      {uiState === 'tool' && activeTool && (
        <div style={{ animation: 'toolPanelIn 0.22s cubic-bezier(0.22,1,0.36,1) both', position: 'fixed', inset: 0, zIndex: 50 }}>
        <ToolPanel
          key={activeTool.id}
          toolId={activeTool.id}
          toolColor={activeTool.color}
          toolLabel={activeTool.label}
          onBack={handleBack}
        />
        </div>
      )}

      {/* Top-right floating controls */}
      <button
        className="app-ctrl-btn app-ctrl-btn--settings"
        onClick={handleOpenSettings}
        title="단축키 설정"
        style={{ position: 'fixed', top: 16, right: 56, zIndex: 100 }}
      >
        ⚙
      </button>

      {/* Quit button */}
      <button
        className="app-ctrl-btn app-ctrl-btn--quit"
        onClick={handleClose}
        title="앱 종료"
        style={{ position: 'fixed', top: 16, right: 20, zIndex: 100 }}
      >
        ✕
      </button>
    </div>
  )
}
