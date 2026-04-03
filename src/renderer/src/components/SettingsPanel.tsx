import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { T, THEME_PRESETS, rgba, setTheme, useTheme } from '../utils/theme'
import { useAppStore } from '../store/appStore'

const isWeb = !('__electron__' in window || navigator.userAgent.includes('Electron'))
const COMPACT_MQ = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px), (max-height: 500px)') : null
function useCompact(): boolean {
  return useSyncExternalStore(
    (cb) => { COMPACT_MQ?.addEventListener('change', cb); return () => COMPACT_MQ?.removeEventListener('change', cb) },
    () => COMPACT_MQ?.matches ?? false,
  )
}

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
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
        <span style={{ fontSize: 17, lineHeight: 1.29, color: rgba(T.fg, 0.92), fontWeight: 400, letterSpacing: '-0.41px' }}>{label}</span>
        <span style={{ fontSize: 15, lineHeight: 1.33, color: rgba(T.fg, 0.60), fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.41px' }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
  )
}

// --- KeyBadge ---
function KeyBadge({ keys, color: _color, inline }: { keys: string; color: string; inline?: boolean }): React.ReactElement {
  const parts = keys.split('+')
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: inline ? 'nowrap' : 'wrap' }}>
      {parts.map((k, i) => (
        <React.Fragment key={k}>
          <span style={{
            padding: '4px 10px', borderRadius: 6, fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 12, fontWeight: 600,
            background: rgba(T.fg, 0.06), border: 'none', color: rgba(T.fg, 0.7),
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}>
            {k}
          </span>
          {i < parts.length - 1 && <span style={{ color: rgba(T.fg, 0.60), fontSize: 10 }}>+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}

// --- StatusMsg ---
function StatusMsg({ ok, msg }: { ok: boolean; msg: string }): React.ReactElement {
  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
      background: ok ? rgba(T.teal, 0.08) : 'rgba(255,69,58,0.08)',
      border: 'none',
      color: ok ? T.teal : '#ff453a',
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

  const compact = useCompact() || isWeb

  return (
    <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', flex: 1, overflow: 'hidden' }}>
      {compact ? (
        <div style={{
          flexShrink: 0,
          padding: 'clamp(12px, 3vw, 16px) clamp(12px, 4vw, 20px)',
          borderBottom: `0.5px solid ${rgba(T.fg, 0.08)}`,
        }}>
          <div role="tablist" aria-label="설정 탭" style={{
            display: 'flex', gap: 'clamp(2px, 0.28vw, 4px)',
            background: rgba(T.fg, 0.06), borderRadius: 'clamp(8px, 0.83vw, 12px)', padding: 'clamp(2px, 0.14vw, 3px)',
            overflow: 'auto', WebkitOverflowScrolling: 'touch',
          }}>
          {TABS.map(t => {
            const isActive = tab === t.id
            return (
              <button key={t.id} role="tab" aria-selected={isActive} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, minWidth: 0,
                  padding: 'clamp(6px, 0.56vw, 8px) clamp(8px, 1.11vw, 14px)',
                  cursor: 'pointer', border: 'none',
                  borderRadius: 'clamp(6px, 0.69vw, 10px)',
                  background: isActive ? rgba(T.fg, 0.1) : 'transparent',
                  color: isActive ? rgba(T.fg, 0.92) : rgba(T.fg, 0.60),
                  fontSize: 'clamp(11px, 0.90vw, 13px)', fontWeight: isActive ? 600 : 500,
                  letterSpacing: '-0.41px', lineHeight: 1.38,
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  minHeight: 'clamp(28px, 2.22vw, 32px)',
                }}>
                {t.label}
              </button>
            )
          })}
          </div>
        </div>
      ) : (
        <div style={{
          width: 'clamp(120px, 12.5vw, 180px)',
          flexShrink: 0,
          borderRight: `0.5px solid ${rgba(T.fg, 0.08)}`,
          padding: 'clamp(16px, 1.67vw, 24px) clamp(8px, 0.83vw, 12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <div style={{
            padding: '0 12px',
            marginBottom: 'clamp(16px, 1.67vw, 24px)',
            fontSize: 'clamp(18px, 1.53vw, 22px)', fontWeight: 700, color: rgba(T.fg, 0.92), letterSpacing: '0.35px', lineHeight: 1.27,
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
                  padding: 'clamp(6px, 0.56vw, 8px) clamp(8px, 0.83vw, 12px)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 'clamp(8px, 0.83vw, 12px)',
                  background: isActive ? rgba(T.fg, 0.1) : 'transparent',
                  color: isActive ? rgba(T.fg, 0.92) : rgba(T.fg, 0.60),
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  minHeight: 'clamp(36px, 3.06vw, 44px)',
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1.33, fontWeight: isActive ? 600 : 400, letterSpacing: '-0.41px' }}>{t.label}</span>
              </button>
            )
          })}
          </div>
        </div>
      )}

      <div role="tabpanel" id={`tabpanel-${tab}`} style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 4vw, 32px)' }}>

        {/* ════ DISPLAY TAB ════ */}
        {tab === 'display' && (
          <div>
            <p style={{ fontSize: 13, lineHeight: 1.38, color: rgba(T.fg, 0.40), marginBottom: 20 }}>
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
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, lineHeight: 1.29, color: rgba(T.fg, 0.92), fontWeight: 400, marginBottom: 10, letterSpacing: '-0.41px' }}>애니메이션 속도</div>
              <div style={{ display: 'flex', background: rgba(T.fg, 0.06), borderRadius: 12, padding: 2 }}>
                {(['slow', 'normal', 'fast', 'none'] as const).map(s => (
                  <button key={s} onClick={() => { setLocalAnim(s); saveDisplay({ animSpeed: s }) }}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, lineHeight: 1.38, fontWeight: localAnim === s ? 600 : 400,
                      border: 'none',
                      background: localAnim === s ? rgba(T.fg, 0.12) : 'transparent',
                      color: localAnim === s ? rgba(T.fg, 0.92) : rgba(T.fg, 0.40),
                      transition: 'all 0.2s ease',
                      boxShadow: localAnim === s ? '0 3px 8px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {s === 'slow' ? '천천히' : s === 'normal' ? '보통' : s === 'fast' ? '빠르게' : '없음'}
                  </button>
                ))}
              </div>
            </div>

            {/* Startup settings */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, lineHeight: 1.38, color: rgba(T.fg, 0.40), marginBottom: 8, paddingLeft: 16 }}>기본 설정</div>
              <div style={{ background: rgba(T.fg, 0.06), borderRadius: 10, overflow: 'hidden' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12, padding: '12px 16px', borderBottom: `0.5px solid ${rgba(T.fg, 0.08)}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'clamp(14px, 1.18vw, 17px)', lineHeight: 1.29, color: rgba(T.fg, 0.92), fontWeight: 400, letterSpacing: '-0.41px' }}>자동 실행</div>
                  <div style={{ fontSize: 'clamp(11px, 0.90vw, 13px)', lineHeight: 1.38, color: rgba(T.fg, 0.40), marginTop: 2 }}>로그인 시 자동 시작</div>
                </div>
                <button
                  onClick={async () => {
                    const next = !loginItem
                    setLoginItem(next)
                    const result = await window.api.appCtrl.setLoginItem(next).catch(() => null)
                    if (!result?.success) setLoginItem(!next)
                  }}
                  style={{
                    width: 'clamp(40px, 3.54vw, 51px)', height: 'clamp(24px, 2.15vw, 31px)', borderRadius: 'clamp(12px, 1.11vw, 16px)', border: 'none',
                    background: loginItem ? '#30D158' : rgba(T.fg, 0.16),
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.25s ease',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 'clamp(20px, 1.88vw, 27px)', height: 'clamp(20px, 1.88vw, 27px)', borderRadius: '50%',
                    background: 'white', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    left: loginItem ? 'clamp(17px, 1.53vw, 22px)' : 'clamp(1px, 0.14vw, 2px)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)',
                  }} />
                </button>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12, padding: '12px 16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'clamp(14px, 1.18vw, 17px)', lineHeight: 1.29, color: rgba(T.fg, 0.92), fontWeight: 400, letterSpacing: '-0.41px' }}>자동 AI 분석</div>
                  <div style={{ fontSize: 'clamp(11px, 0.90vw, 13px)', lineHeight: 1.38, color: rgba(T.fg, 0.40), marginTop: 2 }}>메뉴 열 때 화면 분석</div>
                </div>
                <button
                  onClick={() => setAutoScan(!autoScan)}
                  style={{
                    width: 'clamp(40px, 3.54vw, 51px)', height: 'clamp(24px, 2.15vw, 31px)', borderRadius: 'clamp(12px, 1.11vw, 16px)', border: 'none',
                    background: autoScan ? '#30D158' : rgba(T.fg, 0.16),
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.25s ease',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, width: 'clamp(20px, 1.88vw, 27px)', height: 'clamp(20px, 1.88vw, 27px)', borderRadius: '50%',
                    background: 'white', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    left: autoScan ? 'clamp(17px, 1.53vw, 22px)' : 'clamp(1px, 0.14vw, 2px)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)',
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
                fontSize: 17, fontWeight: 400,
                color: '#0A84FF',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 0',
                transition: 'opacity 0.2s ease',
                letterSpacing: '-0.41px',
              }}
            >
              기본값으로 재설정
            </button>
          </div>
        )}

        {/* ════ THEME TAB ════ */}
        {tab === 'theme' && (() => {
          const current = currentTheme // alias for brevity in JSX
          return (
            <div>
              <p style={{ fontSize: 13, lineHeight: 1.38, color: rgba(T.fg, 0.60), marginBottom: 22 }}>
                앱 전체의 색상 테마를 변경합니다. Primary(장식)와 Accent(강조) 색이 바뀝니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {THEME_PRESETS.map(t => {
                  const active = current.id === t.id
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)} style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: 'none',
                      background: active ? rgba(t.accent, 0.12) : rgba(T.fg, 0.06),
                      transition: 'all 0.2s ease',
                      outline: active ? `2px solid ${rgba(t.accent, 0.5)}` : '2px solid transparent',
                      outlineOffset: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: active ? t.accent : rgba(T.fg, 0.7), letterSpacing: '-0.01em' }}>{t.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 3, height: 3, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ flex: 1, background: t.primary, borderRadius: 2 }} />
                        <div style={{ flex: 1, background: t.accent, borderRadius: 2 }} />
                        <div style={{ flex: 1, background: `linear-gradient(90deg, ${t.primary}, ${t.accent})`, borderRadius: 2 }} />
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
            <p style={{ fontSize: 13, lineHeight: 1.38, color: rgba(T.fg, 0.60), marginBottom: 18 }}>
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
                  transition: 'all 0.2s ease',
                }}
              >
                {recording
                  ? <span style={{ fontSize: 12, color: rgba(T.gold, 0.8), fontStyle: 'italic' }}>키 조합을 입력하세요...</span>
                  : <KeyBadge keys={pendingShortcut || currentShortcut} color={T.gold} inline />
                }
                <span style={{ fontSize: 10, color: rgba(T.fg, 0.40), flexShrink: 0 }}>
                  {recording ? '입력 대기 중' : '클릭하여 변경'}
                </span>
              </div>
              {recording && (
                <button onClick={() => setRecording(false)} style={{ marginTop: 6, fontSize: 11, color: rgba(T.fg, 0.60), background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
                  color: (savingShortcut || recording || !shortcutChanged) ? rgba(T.fg, 0.40) : T.fg,
                  cursor: (savingShortcut || recording || !shortcutChanged) ? 'default' : 'pointer',
                  transition: 'background 0.2s ease',
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
                      <span style={{ fontSize: 10, color: rgba(T.fg, 0.60) }}>{desc}</span>
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
            <p style={{ fontSize: 13, lineHeight: 1.38, color: rgba(T.fg, 0.60), marginBottom: 22 }}>
              AI 채팅 및 화면 분석에 사용할 제공자와 모델을 설정합니다.
            </p>
            {aiLoading && (
              <div style={{ color: rgba(T.fg, 0.60), fontSize: 12, textAlign: 'center', paddingTop: 40 }}>불러오는 중...</div>
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
                          color: aiProvider === p ? T.gold : rgba(T.fg, 0.60),
                          transition: 'all 0.2s ease',
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
                    <div style={{ fontSize: 10, color: rgba(T.fg, 0.60), marginTop: 4 }}>
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
