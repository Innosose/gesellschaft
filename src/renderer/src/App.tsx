import React, { useEffect, useState, useCallback, useMemo } from 'react'
import CenterHub from './components/CenterHub'
import SpiralMenu from './components/SpiralMenu'
import ToolPanel from './components/ToolPanel'

interface Tool {
  id: string
  icon: string
  label: string
  color: string
}

const ALL_TOOLS: Tool[] = [
  { id: 'search',        icon: '🔍', label: '고급 검색',        color: '#0078d4' },
  { id: 'cadConvert',    icon: '📐', label: 'CAD → PDF',         color: '#8764b8' },
  { id: 'pdfTool',       icon: '📄', label: 'PDF 병합 / 분할',   color: '#e74c3c' },
  { id: 'imageConvert',  icon: '🖼️', label: '이미지 변환',       color: '#9b59b6' },
  { id: 'excelTool',     icon: '📊', label: 'Excel / CSV',       color: '#27ae60' },
  { id: 'bulkRename',    icon: '✏️', label: '일괄 이름 변경',    color: '#038387' },
  { id: 'folderCompare', icon: '📂', label: '폴더 비교',         color: '#ca5010' },
  { id: 'todo',          icon: '✅', label: '할일 목록',         color: '#498205' },
  { id: 'reminder',      icon: '🔔', label: '업무 리마인더',     color: '#c19c00' },
  { id: 'notes',         icon: '📝', label: '빠른 메모',         color: '#0099bc' },
  { id: 'snippets',      icon: '💾', label: '스니펫 관리',       color: '#16a085' },
  { id: 'emailTemplate', icon: '✉️', label: '이메일 템플릿',     color: '#8e44ad' },
  { id: 'clipboard',     icon: '📋', label: '클립보드 기록',     color: '#107c41' },
  { id: 'vatCalc',       icon: '🧮', label: '부가세 계산',       color: '#1abc9c' },
  { id: 'dateCalc',      icon: '📅', label: '날짜 계산기',       color: '#3498db' },
  { id: 'exchangeRate',  icon: '💱', label: '환율 계산',         color: '#c0392b' },
  { id: 'unitConverter', icon: '📏', label: '단위 변환',         color: '#d35400' },
  { id: 'translate',     icon: '🌐', label: '번역기',            color: '#2980b9' },
  { id: 'textTools',     icon: '🔤', label: '텍스트 도구',       color: '#7a7574' },
  { id: 'qrCode',        icon: '🔳', label: 'QR 코드 생성',     color: '#34495e' },
  { id: 'colorPicker',   icon: '🎨', label: '색상 피커',         color: '#e67e22' },
  { id: 'ocr',           icon: '🔍', label: '이미지 OCR',        color: '#7f8c8d' },
  { id: 'ai',            icon: '✦',  label: 'AI 어시스턴트',     color: '#a78bfa' },
]

type UIState = 'hub' | 'menu' | 'tool'

export default function App(): React.ReactElement {
  const [uiState, setUiState] = useState<UIState>('hub')
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [recommended, setRecommended] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [hubColor, setHubColor] = useState('#8b5cf6')
  const [toolSearch, setToolSearch] = useState('')
  const [hubSize, setHubSize] = useState(114)
  const [overlayOpacity, setOverlayOpacity] = useState(0.88)
  const [spiralScale, setSpiralScale] = useState(1.0)
  const [animSpeed, setAnimSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')

  // Sync --gs-accent CSS variable whenever hubColor changes (used by range sliders etc.)
  useEffect(() => {
    document.documentElement.style.setProperty('--gs-accent', hubColor)
  }, [hubColor])

  // Load all settings on mount
  useEffect(() => {
    window.api.settings.getTheme().then(color => { if (color) setHubColor(color) })
    window.api.settings.getDisplay().then(d => {
      if (d.hubSize) setHubSize(d.hubSize)
      if (d.overlayOpacity) setOverlayOpacity(d.overlayOpacity)
      if (d.spiralScale) setSpiralScale(d.spiralScale)
      if (d.animSpeed) setAnimSpeed(d.animSpeed as 'slow' | 'normal' | 'fast')
    })
  }, [])

  const handleHubClick = useCallback(() => {
    setUiState(s => (s === 'menu' ? 'hub' : 'menu'))
  }, [])

  const handleToolSelect = useCallback((id: string) => {
    const tool = ALL_TOOLS.find(t => t.id === id) ?? null
    setActiveTool(tool)
    setUiState('tool')
  }, [])

  const handleBack = useCallback(() => {
    setActiveTool(null)
    setUiState('menu')
    setToolSearch('')
  }, [])

  const handleDisplayChange = useCallback((patch: Record<string, unknown>) => {
    if (patch.hubSize !== undefined) setHubSize(patch.hubSize as number)
    if (patch.overlayOpacity !== undefined) setOverlayOpacity(patch.overlayOpacity as number)
    if (patch.spiralScale !== undefined) setSpiralScale(patch.spiralScale as number)
    if (patch.animSpeed !== undefined) setAnimSpeed(patch.animSpeed as 'slow' | 'normal' | 'fast')
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
      if (result.success && result.recommendations.length > 0) {
        setRecommended(result.recommendations)
        setUiState('menu')
      }
    } finally {
      setScanning(false)
    }
  }, [])

  const handleHide = useCallback(() => {
    window.api.window.hide()
  }, [])

  // Click-through: hub 상태에서 배경 클릭이 다른 앱으로 통과되도록
  useEffect(() => {
    if (uiState !== 'hub') {
      window.api.window.setIgnoreMouseEvents(false)
      return
    }
    // hub 상태: 투명 영역은 클릭 통과, 버튼 위에서는 캡처
    window.api.window.setIgnoreMouseEvents(true, { forward: true })
    let lastCall = 0
    let lastHit = false
    const onMove = (e: MouseEvent): void => {
      const now = Date.now()
      if (now - lastCall < 16) return   // throttle ~60fps
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
        onClick={() => { if (uiState === 'menu') setUiState('hub') }}
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
          spiralScale={spiralScale}
          animSpeed={animSpeed}
          filterQuery={toolSearch}
          onSelectTool={(id) => { setToolSearch(''); handleToolSelect(id) }}
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
          <div
            style={{
              position: 'relative',
              pointerEvents: 'auto',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: `rgba(140,110,70,0.65)`,
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
                  color: 'rgba(120,90,50,0.55)',
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

          {/* AI 추천 버튼 — 메뉴가 열렸을 때 검색 아래 표시 */}
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: `1px solid ${hubColor}66`,
              background: `${hubColor}14`,
              color: `${hubColor}ee`,
              fontSize: 11,
              fontWeight: 600,
              cursor: scanning ? 'wait' : 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
              opacity: scanning ? 0.6 : 1,
              pointerEvents: 'auto',
            }}
            onMouseEnter={e => {
              if (!scanning) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = `${hubColor}28`
                el.style.borderColor = `${hubColor}cc`
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = `${hubColor}14`
              el.style.borderColor = `${hubColor}66`
            }}
          >
            {scanning ? '⟳ 분석중...' : '✦ AI 화면 분석'}
          </button>
        </div>
      )}

      {/* Tool Panel */}
      {uiState === 'tool' && activeTool && (
        <ToolPanel
          key={activeTool.id}
          toolId={activeTool.id}
          toolColor={activeTool.color}
          toolLabel={activeTool.label}
          onBack={handleBack}
          hubColor={hubColor}
          hubSize={hubSize}
          overlayOpacity={overlayOpacity}
          spiralScale={spiralScale}
          animSpeed={animSpeed}
          onThemeChange={setHubColor}
          onDisplayChange={handleDisplayChange}
        />
      )}

      {/* Top-right floating controls */}
      <button
        onClick={() => {
          setActiveTool({ id: 'settings', icon: '⚙', label: '설정', color: '#6366f1' })
          setUiState('tool')
        }}
        title="단축키 설정"
        style={{
          position: 'fixed',
          top: 16,
          right: 56,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          transition: 'all 0.15s ease',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(196,181,253,0.85)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.4)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
        }}
      >
        ⚙
      </button>

      {/* Quit button — top right corner, subtle */}
      <button
        onClick={() => window.api.window.close()}
        title="앱 종료"
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          transition: 'all 0.15s ease',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.35)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.5)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
        }}
      >
        ✕
      </button>
    </div>
  )
}
