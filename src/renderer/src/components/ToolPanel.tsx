/**
 * Tool metadata defined in src/shared/constants.ts (ALL_TOOLS)
 * Tool component registry below (TOOL_REGISTRY)
 * To add a new tool: 1) Add to ALL_TOOLS  2) Add lazy import to TOOL_REGISTRY
 */
import React, { lazy, Suspense, useSyncExternalStore } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ToolSkeleton from './ToolSkeleton'
import { useAppStore } from '../store/appStore'
import { T, rgba } from '../utils/theme'

export interface ToolProps { onClose: () => void; asPanel?: boolean }

const lm = (loader: () => Promise<{ default: unknown }>): React.LazyExoticComponent<React.ComponentType<ToolProps>> =>
  lazy(() => loader().then(m => ({ default: m.default as React.ComponentType<ToolProps> })))

const TOOL_REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<ToolProps>>> = {
  settings:     lm(() => import('./SettingsPanel')),
  // A–Z
  ai:           lm(() => import('./AiPanel')),
  batch:        lm(() => import('./BatchModal')),
  clipboard:    lm(() => import('./ClipboardModal')),
  diff:         lm(() => import('./DiffViewerModal')),
  excelTool:    lm(() => import('./ExcelToolModal')),
  finder:       lm(() => import('./FileManagerModal')),
  generator:    lm(() => import('./PasswordGenModal')),
  haste:        lm(() => import('./HasteModal')),
  imageTools:   lm(() => import('./ImageToolsModal')),
  jot:          lm(() => import('./JotModal')),
  keyboard:     lm(() => import('./KeyboardModal')),
  launcher:     lm(() => import('./LauncherModal')),
  memoAlarm:    lm(() => import('./MemoAlarmModal')),
  notepin:      lm(() => import('./ScreenPinModal')),
  organizer:    lm(() => import('./OrganizerModal')),
  pdfTool:      lm(() => import('./PdfToolModal')),
  quickCalc:    lm(() => import('./QuickCalcModal')),
  ruler:        lm(() => import('./RulerModal')),
  stopwatch:    lm(() => import('./MeetingTimerModal')),
  type:         lm(() => import('./TypeModal')),
  upload:       lm(() => import('./UploadModal')),
  vault:        lm(() => import('./EncryptToolModal')),
  whiteboard:   lm(() => import('./ScreenPenModal')),
  xcolor:       lm(() => import('./ColorPickerModal')),
  yourInfo:     lm(() => import('./YourInfoModal')),
  zone:         lm(() => import('./ZoneModal')),
}

/** Fullscreen overlay tools render via OverlayPortal — no modal wrapper needed */
const FULLSCREEN_TOOLS = new Set(['ruler', 'whiteboard', 'zone', 'notepin'])

/** Reactive mobile check */
const MOBILE_MQ = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
function useMobile(): boolean {
  return useSyncExternalStore(
    (cb) => { MOBILE_MQ?.addEventListener('change', cb); return () => MOBILE_MQ?.removeEventListener('change', cb) },
    () => MOBILE_MQ?.matches ?? false,
  )
}

interface ToolPanelProps { toolId: string; toolColor: string; toolLabel: string; onBack: () => void }

export default function ToolPanel({ toolId, toolColor, toolLabel, onBack }: ToolPanelProps): React.ReactElement {
  useAppStore()
  const isMobile = useMobile()
  const LazyTool = TOOL_REGISTRY[toolId]

  // Fullscreen overlay tools render directly without the modal wrapper
  if (FULLSCREEN_TOOLS.has(toolId)) {
    return (
      <ErrorBoundary key={toolId}>
        {LazyTool ? (
          <Suspense fallback={null}><LazyTool onClose={onBack} /></Suspense>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: rgba(T.fg, 0.25), fontSize: 12 }}>
            알 수 없는 도구: {toolId}
          </div>
        )}
      </ErrorBoundary>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      animation: 'panelSlideIn 0.28s cubic-bezier(0.2,0,0,1) both' }}>
      {!isMobile && (
        <div style={{ position: 'absolute', inset: 0, background: rgba(T.bg, 0.94), backdropFilter: 'blur(40px)' }}
          aria-label="닫기" role="button" tabIndex={-1}
          onClick={onBack} />
      )}
      <div style={isMobile ? {
        position: 'absolute', inset: 0,
        background: rgba(T.bg, 0.98),
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      } : {
        position: 'relative', margin: 'auto',
        width: 'clamp(600px, 84vw, 84vh * 16 / 9)', maxWidth: 1200,
        aspectRatio: '16 / 9',
        borderRadius: 6, border: `1px solid ${T.gold10}`,
        background: rgba(T.bg, 0.98),
        boxShadow: `0 0 40px ${rgba(T.gold, 0.03)}, 0 32px 80px rgba(0,0,0,0.6)`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          height: 'clamp(40px, 4vh, 52px)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'clamp(6px, 0.8vw, 12px)', padding: '0 clamp(12px, 1.5vw, 20px)',
          borderBottom: `1px solid ${T.gold06}`,
          background: `linear-gradient(90deg, ${rgba(T.gold, 0.08)}, transparent 30%, transparent 70%, ${rgba(T.gold, 0.08)})`,
        }}>
          <button onClick={onBack} style={{
            minWidth: 44, minHeight: 44, width: 44, height: 44, borderRadius: 4,
            border: `1px solid ${T.gold10}`, background: rgba(T.gold, 0.04),
            color: rgba(T.gold, 0.6), cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }} className="tool-panel-back-btn" aria-label="뒤로 가기">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M7.5 2L3.5 6l4 4"/>
            </svg>
          </button>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: toolColor, opacity: 0.5, flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: rgba(T.fg, 0.92), letterSpacing: '0.02em', flex: 1 }}>
            {toolLabel}
          </span>
        </div>
        <ErrorBoundary key={toolId}>
          <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            {LazyTool ? (
              <Suspense fallback={<ToolSkeleton />}><LazyTool onClose={onBack} asPanel /></Suspense>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: rgba(T.fg, 0.25), fontSize: 12 }}>
                알 수 없는 도구: {toolId}
              </div>
            )}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  )
}
