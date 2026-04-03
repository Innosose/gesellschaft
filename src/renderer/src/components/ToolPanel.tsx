/**
 * ToolPanel — 도구를 macOS 스타일 독립 창에서 렌더링
 *
 * 도구별 최적 창 크기가 지정되어 있으며, 풀스크린 도구(ruler, whiteboard 등)는
 * WindowFrame 없이 오버레이로 렌더링됩니다.
 */
import React, { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import ToolSkeleton from './ToolSkeleton'
import WindowFrame from './WindowFrame'

export interface ToolProps { onClose: () => void; asPanel?: boolean }

const lm = (loader: () => Promise<{ default: unknown }>): React.LazyExoticComponent<React.ComponentType<ToolProps>> =>
  lazy(() => loader().then(m => ({ default: m.default as React.ComponentType<ToolProps> })))

const TOOL_REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType<ToolProps>>> = {
  settings:     lm(() => import('./SettingsPanel')),
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

/* ── 도구별 최적 창 크기 [width, height] ── */
const TOOL_SIZES: Record<string, [number, number]> = {
  // 대형 (복잡한 UI, 사이드바)
  settings:   [780, 540],
  ai:         [720, 600],
  finder:     [860, 580],
  excelTool:  [860, 560],
  pdfTool:    [680, 540],
  imageTools: [720, 560],
  memoAlarm:  [720, 540],

  // 중형
  clipboard:  [560, 480],
  diff:       [700, 500],
  batch:      [600, 460],
  organizer:  [640, 500],
  xcolor:     [520, 560],
  keyboard:   [560, 480],
  launcher:   [520, 440],
  stopwatch:  [560, 520],

  // 소형 (단일 기능)
  quickCalc:  [420, 380],
  jot:        [440, 360],
  haste:      [500, 420],
  generator:  [440, 440],
  type:       [480, 400],
  upload:     [460, 380],
  vault:      [480, 400],
  yourInfo:   [480, 420],
}

const DEFAULT_SIZE: [number, number] = [600, 480]

/** 풀스크린 오버레이 도구 — WindowFrame 없이 렌더 */
const FULLSCREEN_TOOLS = new Set(['ruler', 'whiteboard', 'zone', 'notepin'])

interface ToolPanelProps {
  toolId: string
  toolLabel: string
  onBack: () => void
}

export default function ToolPanel({ toolId, toolLabel, onBack }: ToolPanelProps): React.ReactElement {
  const LazyTool = TOOL_REGISTRY[toolId]

  // 풀스크린 도구
  if (FULLSCREEN_TOOLS.has(toolId)) {
    return (
      <ErrorBoundary key={toolId}>
        {LazyTool ? (
          <Suspense fallback={null}><LazyTool onClose={onBack} /></Suspense>
        ) : (
          <FallbackMsg toolId={toolId} />
        )}
      </ErrorBoundary>
    )
  }

  const [w, h] = TOOL_SIZES[toolId] ?? DEFAULT_SIZE

  return (
    <WindowFrame title={toolLabel} width={w} height={h} onClose={onBack}>
      <ErrorBoundary key={toolId}>
        {LazyTool ? (
          <Suspense fallback={<ToolSkeleton />}>
            <LazyTool onClose={onBack} asPanel />
          </Suspense>
        ) : (
          <FallbackMsg toolId={toolId} />
        )}
      </ErrorBoundary>
    </WindowFrame>
  )
}

function FallbackMsg({ toolId }: { toolId: string }): React.ReactElement {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: 'rgba(255,255,255,0.30)', fontSize: 12,
    }}>
      알 수 없는 도구: {toolId}
    </div>
  )
}
