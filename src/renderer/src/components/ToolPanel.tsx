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

/** True when running in browser (not Electron) */
const isWeb = !('__electron__' in window || navigator.userAgent.includes('Electron'))

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

interface ToolPanelProps { toolId: string; toolColor: string; toolLabel: string; onBack: () => void; tools?: { id: string; icon: string; label: string; color: string }[]; onSelectTool?: (id: string) => void }

export default function ToolPanel({ toolId, toolColor, toolLabel, onBack, tools, onSelectTool }: ToolPanelProps): React.ReactElement {
  useAppStore()
  const isMobile = useMobile()
  const LazyTool = TOOL_REGISTRY[toolId]
  const [search, setSearch] = React.useState('')

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

  // Web/mobile: full-screen iOS Settings-style layout
  // Desktop Electron: centered floating modal
  const useFullScreen = isMobile || isWeb

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex',
      animation: 'panelSlideIn 0.35s cubic-bezier(0.32,0.72,0,1) both' }}>
      {!useFullScreen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)' }}
          aria-label="닫기" role="button" tabIndex={-1}
          onClick={onBack} />
      )}
      <div style={useFullScreen ? {
        position: 'absolute', inset: 0,
        background: rgba(T.bg, 0.98),
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      } : {
        position: 'relative', margin: 'auto',
        width: 'min(900px, 88vw)', maxWidth: 1100,
        height: 'min(640px, 82vh)',
        borderRadius: 'clamp(8px, 1.11vw, 16px)', border: 'none',
        background: rgba(T.fg, 0.04),
        backdropFilter: 'blur(40px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div style={{
          height: 'clamp(40px, 3.6vw, 52px)', flexShrink: 0, display: 'flex', alignItems: 'center',
          gap: 'clamp(8px, 0.83vw, 12px)',
          padding: useFullScreen ? '0 clamp(12px, 4vw, 20px)' : '0 clamp(8px, 1.11vw, 16px)',
          paddingTop: useFullScreen ? 'max(0px, env(safe-area-inset-top, 0px))' : undefined,
          borderBottom: `0.5px solid ${rgba(T.fg, 0.08)}`,
        }}>
          <button onClick={onBack} style={{
            width: 'clamp(24px, 2.22vw, 32px)', height: 'clamp(24px, 2.22vw, 32px)', borderRadius: 'clamp(12px, 1.11vw, 16px)',
            border: 'none', background: rgba(T.fg, 0.08),
            color: rgba(T.fg, 0.40), cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.2s, transform 0.1s',
            minWidth: 44, minHeight: 44,
          }} aria-label="뒤로 가기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8.5 3L4.5 7l4 4"/>
            </svg>
          </button>
          <div style={{ width: 'clamp(6px, 0.56vw, 8px)', height: 'clamp(6px, 0.56vw, 8px)', borderRadius: '50%', background: toolColor, opacity: 0.6, flexShrink: 0 }} />
          <span style={{ fontSize: 'clamp(14px, 1.18vw, 17px)', fontWeight: 600, color: rgba(T.fg, 0.92), letterSpacing: '-0.41px', lineHeight: 1.29, flex: 1 }}>
            {toolLabel}
          </span>
        </div>
        <div style={{
          flexShrink: 0, padding: 'clamp(8px, 0.7vw, 12px) clamp(12px, 1.11vw, 16px)',
          borderBottom: `0.5px solid ${rgba(T.fg, 0.06)}`,
        }}>
          <div style={{ position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3, pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5.5" stroke={T.fg} strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke={T.fg} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="검색" aria-label="도구 내 검색" style={{
                width: '100%', padding: 'clamp(7px, 0.56vw, 9px) clamp(8px, 0.7vw, 10px) clamp(7px, 0.56vw, 9px) clamp(32px, 2.5vw, 38px)',
                borderRadius: 'clamp(8px, 0.69vw, 10px)', border: 'none',
                background: rgba(T.fg, 0.06), color: rgba(T.fg, 0.92),
                fontSize: 'clamp(13px, 1.04vw, 15px)', outline: 'none',
                minHeight: 'clamp(32px, 2.5vw, 36px)', letterSpacing: '-0.41px', lineHeight: 1.33,
              }} />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: rgba(T.fg, 0.12), border: 'none', color: rgba(T.fg, 0.40),
                cursor: 'pointer', fontSize: 9, lineHeight: 1, padding: 0,
                width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            )}
          </div>
        </div>
        {search && tools && onSelectTool ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(4px, 0.42vw, 8px) clamp(12px, 1.11vw, 16px)' }}>
            {(() => {
              const q = search.toLowerCase()
              const matched = tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
              if (matched.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: rgba(T.fg, 0.30), fontSize: 'clamp(12px, 1.04vw, 15px)' }}>결과 없음</div>
              return (
                <div style={{ background: rgba(T.fg, 0.04), borderRadius: 'clamp(8px, 0.83vw, 12px)', overflow: 'hidden' }}>
                  {matched.map((t, i) => (
                    <button key={t.id} onClick={() => { setSearch(''); onSelectTool(t.id) }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 'clamp(8px, 0.83vw, 12px)',
                      padding: '0 clamp(12px, 1.11vw, 16px)', minHeight: 'clamp(36px, 3.06vw, 44px)',
                      border: 'none', background: 'transparent', cursor: 'pointer', color: rgba(T.fg, 0.92),
                      fontSize: 'clamp(13px, 1.04vw, 15px)', letterSpacing: '-0.41px', textAlign: 'left',
                      borderBottom: i < matched.length - 1 ? `0.5px solid ${rgba(T.fg, 0.06)}` : 'none',
                      transition: 'background 0.15s',
                    }}>
                      <span style={{ fontSize: 'clamp(16px, 1.39vw, 20px)' }}>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
