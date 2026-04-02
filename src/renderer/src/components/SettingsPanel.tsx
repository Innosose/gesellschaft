import React, { useEffect, useRef, useState } from 'react'
import { T, THEME_PRESETS, rgba, setTheme, useTheme } from '../utils/theme'
import { useAppStore } from '../store/appStore'

interface AiConfig {
  provider: string
  apiKey: string
  model: string
  systemPrompt: string
  ollamaUrl: string
}

// e.code → Electron accelerator key mapping (layout-independent, works with Korean IME)
const CODE_MAP: Record<string, string> = {
  'Space': 'Space', 'Enter': 'Return', 'Escape': 'Escape', 'Tab': 'Tab',
  'Backspace': 'Backspace', 'Delete': 'Delete', 'Insert': 'Insert',
  'Home': 'Home', 'End': 'End', 'PageUp': 'PageUp', 'PageDown': 'PageDown',
  'ArrowLeft': 'Left', 'ArrowRight': 'Right', 'ArrowUp': 'Up', 'ArrowDown': 'Down',
}
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta'])

function keyEventToAccelerator(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')
  if (parts.length === 0) return null
  const code = e.code
  let key: string
  if (CODE_MAP[code]) {
    key = CODE_MAP[code]
  } else if (/^Key[A-Z]$/.test(code)) {
    key = code.slice(3)           // 'KeyG' → 'G'
  } else if (/^Digit[0-9]$/.test(code)) {
    key = code.slice(5)           // 'Digit1' → '1'
  } else if (/^F\d+$/.test(code)) {
    key = code                    // 'F1' → 'F1'
  } else {
    key = e.key.length === 1 ? e.key.toUpperCase() : e.key  // fallback
  }
  parts.push(key)
  return parts.join('+')
}

// --- Slider helper ---
function Slider({
  label, value, min, max, step = 1, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void
}): React.ReactElement {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 15, color: rgba(T.fg, 0.85), fontWeight: 400 }}>{label}</span>
        <span style={{ fontSize: 15, color: rgba(T.fg, 0.95), fontWeight: 600, fontFamily: 'monospace' }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 13, color: rgba(T.fg, 0.35) }}>{format(min)}</span>
        <span style={{ fontSize: 13, color: rgba(T.fg, 0.35) }}>{format(max)}</span>
      </div>
    </div>
  )
}

// --- KeyBadge ---
function KeyBadge({ keys, color, inline }: { keys: string; color: string; inline?: boolean }): React.ReactElement {
  const parts = keys.split('+')
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: inline ? 'nowrap' : 'wrap' }}>
      {parts.map((k, i) => (
        <React.Fragment key={k}>
          <span style={{
            padding: '3px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
            background: rgba(color, 0.12), border: `1px solid ${rgba(color, 0.28)}`, color: rgba(color, 0.9),
          }}>
            {k}
          </span>
          {i < parts.length - 1 && <span style={{ color: rgba(T.fg, 0.5), fontSize: 10 }}>+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}

// --- StatusMsg ---
function StatusMsg({ ok, msg }: { ok: boolean; msg: string }): React.ReactElement {
  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12,
      background: ok ? rgba(T.teal, 0.09) : 'rgba(224,84,104,0.09)',
      border: `1px solid ${ok ? rgba(T.teal, 0.22) : 'rgba(224,84,104,0.22)'}`,
      color: ok ? rgba(T.teal, 0.9) : 'rgba(224,140,140,0.9)',
    }}>
      {msg}
    </div>
  )
}

type PanelTab = 'display' | 'theme' | 'shortcut' | 'ai'

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: 'display',  icon: '', label: '화면' },
  { id: 'theme',    icon: '', label: '테마' },
  { id: 'shortcut', icon: '', label: '단축키' },
  { id: 'ai',       icon: '', label: 'AI' },
]

export default function SettingsPanel(): React.ReactElement {
  const { hubSize, overlayOpacity, spiralScale, animSpeed, autoScan, setAutoScan, setDisplay } = useAppStore()
  const currentTheme = useTheme()
  const [tab, setTab] = useState<PanelTab>('display')

  // ── Theme state ──

  // ── Display state ──
  const [localHub, setLocalHub] = useState(hubSize)
  const [localOpacity, setLocalOpacity] = useState(Math.round(overlayOpacity * 100))
  const [localSpiral, setLocalSpiral] = useState(Math.round(spiralScale * 100))
  const [localAnim, setLocalAnim] = useState(animSpeed)
  const [loginItem, setLoginItem] = useState(false)

  // store 값 변경 시 로컬 state 동기화
  useEffect(() => {
    setLocalHub(hubSize)
    setLocalOpacity(Math.round(overlayOpacity * 100))
    setLocalSpiral(Math.round(spiralScale * 100))
    setLocalAnim(animSpeed)
  }, [hubSize, overlayOpacity, spiralScale, animSpeed])

  // ── Shortcut state ──
  const [currentShortcut, setCurrentShortcut] = useState('...')
  const [pendingShortcut, setPendingShortcut] = useState('')
  const [recording, setRecording] = useState(false)
  const [shortcutStatus, setShortcutStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [savingShortcut, setSavingShortcut] = useState(false)
  const recorderRef = useRef<HTMLDivElement>(null)

  // ── AI state ──
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null)
  const [aiDraft, setAiDraft] = useState<Partial<AiConfig & { apiKeyRaw?: string }>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  const [aiPresetModels, setAiPresetModels] = useState<Record<string, string[]>>({})
  const [aiOllamaModels, setAiOllamaModels] = useState<string[]>([])

  useEffect(() => {
    window.api.settings.getShortcut().then(s => { setCurrentShortcut(s); setPendingShortcut(s) })
    window.api.appCtrl.getLoginItem().then(setLoginItem)
  }, [])

  useEffect(() => {
    if (tab !== 'ai' || aiConfig !== null) return
    setAiLoading(true)
    window.api.ai.getConfig().then(cfg => { setAiConfig(cfg); setAiDraft({ ...cfg }) }).finally(() => setAiLoading(false))
    window.api.ai.getPresetModels().then(setAiPresetModels).catch(() => {})
  }, [tab, aiConfig])

  // Shortcut key recorder
  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault(); e.stopPropagation()
      const acc = keyEventToAccelerator(e)
      if (acc) { setPendingShortcut(acc); setRecording(false); setShortcutStatus(null) }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [recording])

  useEffect(() => { if (recording) recorderRef.current?.focus() }, [recording])

  // ── Handlers ──
  const saveDisplay = (patch: Partial<{ hubSize: number; overlayOpacity: number; spiralScale: number; animSpeed: 'slow' | 'normal' | 'fast' | 'none' }>): void => {
    setDisplay(patch) // Zustand: API 저장 + 상태 업데이트
  }

  const handleSaveShortcut = async (): Promise<void> => {
    if (!pendingShortcut || pendingShortcut === currentShortcut) return
    setSavingShortcut(true); setShortcutStatus(null)
    const res = await window.api.settings.setShortcut(pendingShortcut)
    setSavingShortcut(false)
    if (res.success) {
      setCurrentShortcut(res.shortcut ?? pendingShortcut)
      setShortcutStatus({ ok: true, msg: '저장되었습니다. 즉시 적용됩니다.' })
    } else {
      setShortcutStatus({ ok: false, msg: res.error ?? '저장 실패' })
    }
  }

  const shortcutChanged = pendingShortcut !== currentShortcut && pendingShortcut !== ''

  const handleSaveAiConfig = async (): Promise<void> => {
    try {
      await window.api.ai.setConfig(aiDraft as Record<string, unknown>)
      const updated = await window.api.ai.getConfig()
      setAiConfig(updated); setAiDraft({ ...updated })
      setAiSaved(true); setTimeout(() => setAiSaved(false), 2000)
    } catch { /* ignore */ }
  }

  const loadOllamaModels = async (): Promise<void> => {
    try { setAiOllamaModels(await window.api.ai.getOllamaModels()) } catch { setAiOllamaModels([]) }
  }

  const aiProvider = (aiDraft.provider ?? aiConfig?.provider ?? '') as string
  const aiModels = aiProvider === 'ollama' ? aiOllamaModels : (aiPresetModels[aiProvider] ?? [])

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{
        width: 200,
        flexShrink: 0,
        borderRight: `1px solid ${rgba(T.fg, 0.06)}`,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{
          padding: '0 12px',
          marginBottom: 16,
          fontSize: 13, color: rgba(T.fg, 0.45),
        }}>
          설정
        </div>
        <div role="tablist" aria-label="설정 탭" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TABS.map(t => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-label={t.label}
              aria-controls={`tabpanel-${t.id}`}
              onClick={() => setTab(t.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                cursor: 'pointer',
                border: 'none',
                borderRadius: 12,
                background: isActive ? rgba(T.fg, 0.08) : 'transparent',
                color: isActive ? rgba(T.fg, 0.95) : rgba(T.fg, 0.55),
                textAlign: 'left',
                transition: 'all 0.15s ease',
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
            </button>
          )
        })}
        </div>
      </div>

      {/* Right content area */}
      <div role="tabpanel" id={`tabpanel-${tab}`} style={{ flex: 1, overflowY: 'auto', padding: 'clamp(20px, 4vw, 32px)' }}>

        {/* ════ DISPLAY TAB ════ */}
        {tab === 'display' && (
          <div>
            <p style={{ fontSize: 13, color: rgba(T.fg, 0.45), marginBottom: 24, lineHeight: 1.5 }}>
              허브 크기, 오버레이 투명도, 나선 간격, 애니메이션 속도를 조절합니다.
            </p>

            <Slider
              label="허브 크기"
              value={localHub}
              min={72} max={180} step={2}
              format={v => `${v}px`}
              onChange={v => { setLocalHub(v); saveDisplay({ hubSize: v }) }}
            />
            <Slider
              label="오버레이 불투명도"
              value={localOpacity}
              min={60} max={97} step={1}
              format={v => `${v}%`}
              onChange={v => { setLocalOpacity(v); saveDisplay({ overlayOpacity: v / 100 }) }}
            />
            <Slider
              label="나선 간격"
              value={localSpiral}
              min={60} max={160} step={5}
              format={v => `${v}%`}
              onChange={v => { setLocalSpiral(v); saveDisplay({ spiralScale: v / 100 }) }}
            />

            {/* Animation speed */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, color: rgba(T.fg, 0.85), fontWeight: 400, marginBottom: 10 }}>애니메이션 속도</div>
              <div style={{ display: 'flex', background: rgba(T.fg, 0.06), borderRadius: 12, padding: 3 }}>
                {(['slow', 'normal', 'fast', 'none'] as const).map(s => (
                  <button key={s} onClick={() => { setLocalAnim(s); saveDisplay({ animSpeed: s }) }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      border: 'none',
                      background: localAnim === s ? rgba(T.fg, 0.12) : 'transparent',
                      color: localAnim === s ? rgba(T.fg, 0.95) : rgba(T.fg, 0.5),
                      transition: 'all 0.15s ease',
                    }}>
                    {s === 'slow' ? '천천히' : s === 'normal' ? '보통' : s === 'fast' ? '빠르게' : '없음'}
                  </button>
                ))}
              </div>
            </div>

            {/* Startup settings */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: rgba(T.fg, 0.45), marginBottom: 8, paddingLeft: 16 }}>기본 설정</div>
              <div style={{ background: rgba(T.fg, 0.04), borderRadius: 12, overflow: 'hidden' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${rgba(T.fg, 0.06)}` }}>
                <div>
                  <div style={{ fontSize: 15, color: rgba(T.fg, 0.85), fontWeight: 400 }}>Windows 시작 시 자동 실행</div>
                  <div style={{ fontSize: 13, color: rgba(T.fg, 0.45), marginTop: 4 }}>로그인 시 게젤샤프트가 자동으로 시작됩니다</div>
                </div>
                <button
                  onClick={async () => {
                    const next = !loginItem
                    setLoginItem(next)
                    const result = await window.api.appCtrl.setLoginItem(next).catch(() => null)
                    if (!result?.success) setLoginItem(!next)
                  }}
                  style={{
                    width: 51, height: 31, borderRadius: 16, border: 'none',
                    background: loginItem ? T.gold : rgba(T.fg, 0.12),
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s ease',
                    boxShadow: loginItem ? `0 0 10px ${rgba(T.gold, 0.4)}` : 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 27, height: 27, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s ease',
                    left: loginItem ? 22 : 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12, padding: '14px 16px' }}>
                <div>
                  <div style={{ fontSize: 15, color: rgba(T.fg, 0.85), fontWeight: 400 }}>메뉴 열 때 자동 AI 분석</div>
                  <div style={{ fontSize: 13, color: rgba(T.fg, 0.45), marginTop: 4 }}>메뉴를 처음 열 때 화면을 자동으로 분석하여 도구를 추천합니다</div>
                </div>
                <button
                  onClick={() => setAutoScan(!autoScan)}
                  style={{
                    width: 51, height: 31, borderRadius: 16, border: 'none',
                    background: autoScan ? T.teal : rgba(T.fg, 0.12),
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s ease',
                    boxShadow: autoScan ? `0 0 10px ${rgba(T.teal, 0.4)}` : 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 27, height: 27, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s ease',
                    left: autoScan ? 22 : 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </label>
              </div>
            </div>

            {/* Reset to best-visibility defaults */}
            <button
              onClick={() => {
                const BEST = { hubSize: 140, overlayOpacity: 0.92, spiralScale: 1.0, animSpeed: 'normal' as const }
                setLocalHub(BEST.hubSize)
                setLocalOpacity(Math.round(BEST.overlayOpacity * 100))
                setLocalSpiral(Math.round(BEST.spiralScale * 100))
                setLocalAnim(BEST.animSpeed)
                saveDisplay(BEST)
              }}
              style={{
                fontSize: 15, fontWeight: 400,
                color: T.teal,
                background: 'none',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                padding: '12px 0',
                transition: 'all 0.15s ease',
                letterSpacing: '0.03em',
              }}
            >
              최적 시인성으로 초기화
            </button>
          </div>
        )}

        {/* ════ THEME TAB ════ */}
        {tab === 'theme' && (() => {
          const current = currentTheme // alias for brevity in JSX
          return (
            <div>
              <p style={{ fontSize: 11, color: rgba(T.fg, 0.62), marginBottom: 22, lineHeight: 1.6 }}>
                앱 전체의 색상 테마를 변경합니다. Primary(장식)와 Accent(강조) 색이 바뀝니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {THEME_PRESETS.map(t => {
                  const active = current.id === t.id
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)} style={{
                      padding: '14px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: active ? `2px solid ${t.accent}` : `2px solid ${rgba(T.fg, 0.08)}`,
                      background: active ? rgba(t.accent, 0.08) : rgba(T.fg, 0.04),
                      transition: 'all 0.15s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: t.primary, border: `1px solid ${rgba(T.fg, 0.1)}` }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: t.accent, border: `1px solid ${rgba(T.fg, 0.1)}` }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: active ? t.accent : rgba(T.fg, 0.75) }}>{t.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, height: 4, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ flex: 1, background: t.primary }} />
                        <div style={{ flex: 1, background: t.accent }} />
                        <div style={{ flex: 1, background: `linear-gradient(90deg, ${t.primary}, ${t.accent})` }} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Preview */}
              <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 8, border: `1px solid ${rgba(current.primary, 0.2)}`, background: rgba(current.primary, 0.04) }}>
                <div className="section-header" style={{ marginBottom: 10, color: rgba(current.primary, 0.6) }}>미리보기</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${current.primary}`, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: current.accent, fontFamily: current.titleFont }}>GS</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: current.accent, marginBottom: 2 }}>Gesellschaft</div>
                    <div style={{ fontSize: 10, color: rgba(current.primary, 0.7) }}>Book, Clock and Tools</div>
                  </div>
                  <div style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${rgba(current.accent, 0.3)}`, background: rgba(current.accent, 0.08), color: current.accent, fontSize: 10, fontWeight: 600 }}>버튼</div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ════ SHORTCUT TAB ════ */}
        {tab === 'shortcut' && (
          <div>
            <p style={{ fontSize: 11, color: rgba(T.fg, 0.62), marginBottom: 18, lineHeight: 1.6 }}>
              오버레이를 표시/숨기는 글로벌 단축키입니다. Ctrl, Alt, Shift 중 하나 이상 + 키 조합이 필요합니다.
            </p>

            <div style={{ marginBottom: 14 }}>
              <div className="section-header">현재 단축키</div>
              <KeyBadge keys={currentShortcut} color={T.gold} />
            </div>

            <div style={{ marginBottom: shortcutStatus ? 14 : 18 }}>
              <div className="section-header">새 단축키</div>
              <div
                ref={recorderRef} tabIndex={0}
                onClick={() => { setRecording(true); setShortcutStatus(null) }}
                style={{
                  padding: '14px 18px', borderRadius: 10, outline: 'none',
                  cursor: recording ? 'default' : 'pointer',
                  border: recording ? `2px solid ${rgba(T.gold, 0.8)}` : shortcutChanged ? '2px solid rgba(99,174,120,0.55)' : `1.5px solid ${rgba(T.fg, 0.1)}`,
                  background: recording ? rgba(T.gold, 0.07) : rgba(T.fg, 0.03),
                  boxShadow: recording ? `0 0 20px ${rgba(T.gold, 0.12)}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                {recording
                  ? <span style={{ fontSize: 12, color: rgba(T.gold, 0.8), fontStyle: 'italic' }}>키 조합을 입력하세요...</span>
                  : <KeyBadge keys={pendingShortcut || currentShortcut} color={T.gold} inline />
                }
                <span style={{ fontSize: 10, color: rgba(T.fg, 0.48), flexShrink: 0 }}>
                  {recording ? '입력 대기 중' : '클릭하여 변경'}
                </span>
              </div>
              {recording && (
                <button onClick={() => setRecording(false)} style={{ marginTop: 6, fontSize: 11, color: rgba(T.fg, 0.52), background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  취소
                </button>
              )}
            </div>

            {shortcutStatus && <StatusMsg ok={shortcutStatus.ok} msg={shortcutStatus.msg} />}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={handleSaveShortcut}
                disabled={savingShortcut || recording || !shortcutChanged}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                  background: (savingShortcut || recording || !shortcutChanged) ? rgba(T.gold, 0.22) : rgba(T.gold, 0.88),
                  color: (savingShortcut || recording || !shortcutChanged) ? rgba(T.fg, 0.48) : T.fg,
                  cursor: (savingShortcut || recording || !shortcutChanged) ? 'default' : 'pointer',
                  transition: 'background 0.12s ease',
                }}
              >
                {savingShortcut ? '저장 중...' : '저장'}
              </button>
            </div>

            {/* App shortcuts reference */}
            <div style={{ marginTop: 28, borderTop: `1px solid ${rgba(T.gold, 0.06)}`, paddingTop: 20 }}>
              <div className="section-header" style={{ marginBottom: 12 }}>앱 내 단축키</div>
              {([
                { label: '일반', items: [['Esc', '닫기 / 뒤로가기'], ['?', '단축키 도움말']] },
                { label: '메뉴 탐색', items: [['← →', '이전 / 다음 도구'], ['Home', '첫 번째 도구 (A)'], ['End', '마지막 도구 (Z)'], ['↑ ↓', '전체 보기 토글'], ['Enter', '도구 선택'], ['스크롤', '도구 회전']] },
                { label: '검색', items: [['텍스트 입력', '도구 이름으로 필터'], ['카테고리 클릭', '분류별 필터']] },
              ] as const).map(section => (
                <div key={section.label} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: rgba(T.gold, 0.4), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>{section.label}</div>
                  {section.items.map(([key, desc]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                      <kbd style={{ fontSize: 10, fontWeight: 600, color: T.teal, fontFamily: 'monospace', background: rgba(T.teal, 0.06), padding: '1px 8px', borderRadius: 3, border: `1px solid ${rgba(T.teal, 0.08)}`, minWidth: 50, textAlign: 'center' }}>{key}</kbd>
                      <span style={{ fontSize: 10, color: rgba(T.fg, 0.5) }}>{desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ AI TAB ════ */}
        {tab === 'ai' && (
          <div>
            <p style={{ fontSize: 11, color: rgba(T.fg, 0.62), marginBottom: 22, lineHeight: 1.6 }}>
              AI 채팅 및 화면 분석에 사용할 제공자와 모델을 설정합니다.
            </p>
            {aiLoading && (
              <div style={{ color: rgba(T.fg, 0.55), fontSize: 12, textAlign: 'center', paddingTop: 40 }}>불러오는 중...</div>
            )}
            {!aiLoading && aiConfig && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--win-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>AI 제공자</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['openai', 'anthropic', 'ollama'] as const).map(p => (
                      <button key={p}
                        onClick={() => setAiDraft(d => ({ ...d, provider: p, model: '' }))}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          border: aiProvider === p ? `2px solid ${T.gold}` : `2px solid ${rgba(T.fg, 0.1)}`,
                          background: aiProvider === p ? rgba(T.gold, 0.15) : rgba(T.fg, 0.07),
                          color: aiProvider === p ? T.gold : rgba(T.fg, 0.65),
                          transition: 'all 0.15s ease',
                        }}>
                        {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Ollama'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--win-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>모델</span>
                    {aiProvider === 'ollama' && (
                      <button onClick={loadOllamaModels} style={{ fontSize: 10, color: rgba(T.gold, 0.85), background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        새로고침
                      </button>
                    )}
                  </div>
                  {aiModels.length > 0 ? (
                    <select value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      style={{ width: '100%', height: 32, fontSize: 12, padding: '0 10px', background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.88), border: `1px solid ${rgba(T.fg, 0.16)}`, borderRadius: 8 }}>
                      {aiModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      placeholder={aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'anthropic' ? 'claude-sonnet-4-5' : '모델명 입력...'}
                      style={{ width: '100%', height: 32, fontSize: 12, padding: '0 10px', background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.88), border: `1px solid ${rgba(T.fg, 0.16)}`, borderRadius: 8, boxSizing: 'border-box' }} />
                  )}
                </div>
                {aiProvider !== 'ollama' && (
                  <div>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--win-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>API 키</div>
                    <input type="password" value={aiDraft.apiKeyRaw ?? ''}
                      onChange={e => setAiDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                      placeholder={aiConfig.apiKey ? `현재: ••••${aiConfig.apiKey.slice(-4)}` : 'API 키를 입력하세요...'}
                      style={{ width: '100%', height: 32, fontSize: 12, padding: '0 10px', background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.88), border: `1px solid ${rgba(T.fg, 0.16)}`, borderRadius: 8, boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 10, color: rgba(T.fg, 0.52), marginTop: 4 }}>
                      비워두면 기존 키가 유지됩니다.
                      {aiProvider === 'openai' && ' OpenAI 대시보드에서 발급하세요.'}
                      {aiProvider === 'anthropic' && ' Anthropic Console에서 발급하세요.'}
                    </div>
                  </div>
                )}
                {aiProvider === 'ollama' && (
                  <div>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--win-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>Ollama 서버 URL</div>
                    <input value={aiDraft.ollamaUrl ?? ''} onChange={e => setAiDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                      placeholder="http://localhost:11434"
                      style={{ width: '100%', height: 32, fontSize: 12, padding: '0 10px', background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.88), border: `1px solid ${rgba(T.fg, 0.16)}`, borderRadius: 8, boxSizing: 'border-box' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--win-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>시스템 프롬프트</div>
                  <textarea value={aiDraft.systemPrompt ?? ''} onChange={e => setAiDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                    rows={4} placeholder="AI의 역할이나 응답 방식을 지정합니다. 비워두면 기본값 사용."
                    style={{ width: '100%', fontSize: 12, resize: 'vertical', padding: '8px 10px', lineHeight: 1.5, fontFamily: 'inherit', background: rgba(T.bg, 0.95), color: rgba(T.fg, 0.88), border: `1px solid ${rgba(T.fg, 0.16)}`, borderRadius: 8, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveAiConfig} style={{
                    padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: aiSaved ? rgba(T.teal, 0.25) : rgba(T.gold, 0.88),
                    color: aiSaved ? rgba(T.teal, 0.9) : 'white',
                    transition: 'all 0.2s ease',
                  }}>
                    {aiSaved ? '✓ 저장됨' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
