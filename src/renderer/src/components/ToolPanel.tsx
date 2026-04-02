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

/** Reactive mobile check — includes landscape phones (small height) */
const MOBILE_MQ = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px), (max-height: 500px)') : null
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
      animation: 'panelSlideIn 0.32s cubic-bezier(0.32,0.72,0,1) both' }}>
      {!isMobile && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          aria-label="닫기" role="button" tabIndex={-1}
          onClick={onBack} />
      )}
      <div style={isMobile ? {
        position: 'absolute', inset: 0,
        background: rgba(T.bg, 0.98),
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      } : {
        position: 'relative', margin: 'auto',
        width: 'min(900px, 88vw)', maxWidth: 1100,
        height: 'min(640px, 82vh)',
        borderRadius: 12, border: 'none',
        background: rgba(T.fg, 0.04),
        backdropFilter: 'blur(40px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div style={{
          height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
          borderBottom: `0.5px solid ${rgba(T.fg, 0.08)}`,
        }}>
          <button onClick={onBack} style={{
            width: 30, height: 30, borderRadius: 15,
            border: 'none', background: rgba(T.fg, 0.08),
            color: rgba(T.fg, 0.5), cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.15s',
          }} aria-label="뒤로 가기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8.5 3L4.5 7l4 4"/>
            </svg>
          </button>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: toolColor, opacity: 0.6, flexShrink: 0 }} />
          <span style={{ fontSize: 17, fontWeight: 600, color: rgba(T.fg, 0.9), letterSpacing: '-0.02em', flex: 1 }}>
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
