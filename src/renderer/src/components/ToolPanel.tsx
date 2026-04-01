import React, { lazy, Suspense, useState } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ToolSkeleton from './ToolSkeleton'
import { useAppStore } from '../store/appStore'

// ── 도구 props 공통 인터페이스 ─────────────────────────────
export interface ToolProps {
  onClose: () => void
  asPanel?: boolean
}

// ── 레이지 레지스트리 — 사용 시점에만 번들 로드 ──────────────
// Heavy libs(pdf-lib, exceljs, tesseract.js)는 각 도구 모달 내부에서
// dynamic import()로 로드되므로 초기 렌더러 번들 크기에 영향 없음.
const TOOL_REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<ToolProps>>> = {
  settings:    lazy(() => import('./SettingsPanel').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  ai:          lazy(() => import('./AiPanel').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  todo:        lazy(() => import('./TodoModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  clipboard:   lazy(() => import('./ClipboardModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  memoAlarm:   lazy(() => import('./MemoAlarmModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  docTemplate: lazy(() => import('./DocTemplateModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  meetingTimer:lazy(() => import('./MeetingTimerModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  dateTools:   lazy(() => import('./DateToolsModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  translate:   lazy(() => import('./TranslateModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  salaryCalc:  lazy(() => import('./SalaryCalcModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  calculator:  lazy(() => import('./CalculatorModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  pdfTool:     lazy(() => import('./PdfToolModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  excelTool:   lazy(() => import('./ExcelToolModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  imageTools:  lazy(() => import('./ImageToolsModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  textTools:   lazy(() => import('./TextToolsModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  fileManager: lazy(() => import('./FileManagerModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  cadConvert:  lazy(() => import('./CadConvertModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  pomodoro:    lazy(() => import('./PomodoroModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
  devTools:    lazy(() => import('./DevToolsModal').then(m => ({ default: m.default as React.ComponentType<ToolProps> }))),
}

// ── folder input 가 필요한 도구 목록 ─────────────────────────
const FOLDER_TOOLS = new Set(['fileManager'])

interface ToolPanelProps {
  toolId: string
  toolColor: string
  toolLabel: string
  onBack: () => void
}

export default function ToolPanel({
  toolId,
  toolColor,
  toolLabel,
  onBack,
}: ToolPanelProps): React.ReactElement {
  useAppStore()   // subscribe so hubColor changes re-render panel border
  const [folder, setFolder] = useState('')

  const LazyTool = TOOL_REGISTRY[toolId]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        animation: 'panelSlideIn 0.32s cubic-bezier(0.2,0,0,1) both',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(6,5,15,0.92)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={onBack}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          margin: 'auto',
          width: '82vw',
          maxWidth: 1100,
          height: '82vh',
          borderRadius: 16,
          border: `1px solid ${toolColor}40`,
          background: 'rgba(14,12,26,0.97)',
          boxShadow: `0 0 80px ${toolColor}20, 0 32px 80px rgba(0,0,0,0.7)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            borderBottom: `1px solid ${toolColor}30`,
            background: `linear-gradient(90deg, ${toolColor}18, transparent)`,
          }}
        >
          <button
            onClick={onBack}
            className="tool-panel-back-btn"
            aria-label="뒤로 가기"
          >
            ←
          </button>

          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: toolColor,
              boxShadow: `0 0 8px ${toolColor}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.88)',
              letterSpacing: '0.02em',
              flex: 1,
            }}
          >
            {toolLabel}
          </span>

          {FOLDER_TOOLS.has(toolId) && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="win-input"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="작업 폴더 경로..."
                style={{ height: 28, width: 260, padding: '3px 10px', fontSize: 12 }}
              />
              <button
                className="win-btn-secondary"
                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                onClick={async () => {
                  const dir = await window.api.dialog.openDirectory()
                  if (dir) setFolder(dir)
                }}
              >
                찾기
              </button>
            </div>
          )}
        </div>

        {/* Tool content — per-tool ErrorBoundary so one crash won't kill the app */}
        <ErrorBoundary key={toolId}>
          <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            {LazyTool ? (
              <Suspense fallback={<ToolSkeleton />}>
                <LazyTool onClose={onBack} asPanel />
              </Suspense>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                알 수 없는 도구: {toolId}
              </div>
            )}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  )
}
