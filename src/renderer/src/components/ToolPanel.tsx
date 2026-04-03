/**
 * Tool metadata defined in src/shared/constants.ts (ALL_TOOLS)
 * Tool component registry below (TOOL_REGISTRY)
 * To add a new tool: 1) Add to ALL_TOOLS  2) Add lazy import to TOOL_REGISTRY
 */
import React, { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ToolSkeleton from './ToolSkeleton'
import { useAppStore } from '../store/appStore'
import { T } from '../utils/theme'

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

/* iOS system colors */
const C = {
  bg: '#000',
  text: 'rgba(255,255,255,0.92)',
  secondary: 'rgba(255,255,255,0.55)',
  muted: 'rgba(255,255,255,0.30)',
  separator: 'rgba(255,255,255,0.06)',
  surface: 'rgba(255,255,255,0.06)',
} as const

interface ToolPanelProps {
  toolId: string
  toolColor: string
  toolLabel: string
  onBack: () => void
  tools?: { id: string; icon: string; label: string; color: string }[]
  onSelectTool?: (id: string) => void
}

export default function ToolPanel({ toolId, toolLabel, onBack, tools, onSelectTool }: ToolPanelProps): React.ReactElement {
  useAppStore()
  const LazyTool = TOOL_REGISTRY[toolId]
  const [search, setSearch] = React.useState('')

  // Fullscreen overlay tools render directly without any wrapper
  if (FULLSCREEN_TOOLS.has(toolId)) {
    return (
      <ErrorBoundary key={toolId}>
        {LazyTool ? (
          <Suspense fallback={null}><LazyTool onClose={onBack} /></Suspense>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontSize: 12 }}>
            알 수 없는 도구: {toolId}
          </div>
        )}
      </ErrorBoundary>
    )
  }

  const filteredTools = React.useMemo(() => {
    if (!search || !tools) return []
    const q = search.toLowerCase()
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  }, [search, tools])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 150,
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'panelSlideIn 0.3s cubic-bezier(0.32,0.72,0,1) both',
    }}>

      {/* ── Navigation bar ── */}
      <div style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: `0.5px solid ${C.separator}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            color: T.teal,
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: '-0.41px',
            lineHeight: 1.29,
            display: 'flex',
            alignItems: 'center',
            minHeight: 44,
            minWidth: 44,
          }}
          aria-label="뒤로 가기"
        >
          ‹ 뒤로
        </button>

        <span style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 600,
          color: C.text,
          letterSpacing: '-0.41px',
          lineHeight: 1.29,
          marginRight: 44,
        }}>
          {toolLabel}
        </span>
      </div>

      {/* ── Search bar ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 20px',
        borderBottom: `0.5px solid ${C.separator}`,
      }}>
        <div style={{ position: 'relative' }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          >
            <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색"
            aria-label="도구 내 검색"
            style={{
              width: '100%',
              padding: '8px 36px 8px 36px',
              borderRadius: 10,
              border: 'none',
              background: C.surface,
              color: C.text,
              fontSize: 15,
              outline: 'none',
              minHeight: 36,
              letterSpacing: '-0.41px',
              lineHeight: 1.33,
            }}
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: C.secondary,
                cursor: 'pointer',
                fontSize: 9,
                lineHeight: 1,
                padding: 0,
                width: 18,
                height: 18,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      {search && tools && onSelectTool ? (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 20px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {filteredTools.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: C.muted,
              fontSize: 15,
            }}>
              결과 없음
            </div>
          ) : (
            <div style={{
              background: C.surface,
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {filteredTools.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => { setSearch(''); onSelectTool(t.id) }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 16px',
                    minHeight: 44,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: C.text,
                    fontSize: 17,
                    letterSpacing: '-0.41px',
                    textAlign: 'left',
                    borderBottom: i < filteredTools.length - 1 ? `0.5px solid ${C.separator}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  <svg
                    width="7"
                    height="12"
                    viewBox="0 0 7 12"
                    fill="none"
                    style={{ flexShrink: 0, opacity: 0.3 }}
                  >
                    <path d="M1 1l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ErrorBoundary key={toolId}>
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            {LazyTool ? (
              <Suspense fallback={<ToolSkeleton />}>
                <LazyTool onClose={onBack} asPanel />
              </Suspense>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: C.muted,
                fontSize: 12,
              }}>
                알 수 없는 도구: {toolId}
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}
    </div>
  )
}
