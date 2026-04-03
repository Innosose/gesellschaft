import React, { useEffect, useRef, useState } from 'react'
import { T, THEME_PRESETS, setTheme, useTheme } from '../utils/theme'
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
    key = code.slice(3)
  } else if (/^Digit[0-9]$/.test(code)) {
    key = code.slice(5)
  } else if (/^F\d+$/.test(code)) {
    key = code
  } else {
    key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  }
  parts.push(key)
  return parts.join('+')
}

// --- iOS-style Slider ---
function Slider({
  label, value, min, max, step = 1, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void
}): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '0 16px',
      marginBottom: 8,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        minHeight: 44,
      }}>
        <span style={{ fontSize: 17, color: 'white', fontWeight: 400 }}>{label}</span>
        <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{format(value)}</span>
      </div>
      <div style={{ paddingBottom: 12 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}

// --- KeyBadge ---
function KeyBadge({ keys, inline }: { keys: string; color?: string; inline?: boolean }): React.ReactElement {
  const parts = keys.split('+')
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: inline ? 'nowrap' : 'wrap' }}>
      {parts.map((k, i) => (
        <React.Fragment key={k}>
          <span style={{
            padding: '4px 10px', borderRadius: 6, fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 13, fontWeight: 600,
            background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.60)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}>
            {k}
          </span>
          {i < parts.length - 1 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}

// --- StatusMsg ---
function StatusMsg({ ok, msg }: { ok: boolean; msg: string }): React.ReactElement {
  return (
    <div style={{
      margin: '0 16px', marginBottom: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13,
      background: ok ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.08)',
      color: ok ? '#30d158' : '#ff453a',
    }}>
      {msg}
    </div>
  )
}

// --- iOS Toggle Switch ---
function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 51, height: 31, borderRadius: 16, border: 'none',
        background: on ? '#30d158' : 'rgba(255,255,255,0.16)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s ease',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, width: 27, height: 27, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        left: on ? 22 : 2,
        boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)',
      }} />
    </button>
  )
}

// --- iOS Section Header ---
function SectionHeader({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      fontSize: 13, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
      paddingLeft: 16, marginBottom: 6, fontWeight: 400, letterSpacing: '-0.08px',
    }}>
      {children}
    </div>
  )
}

// --- iOS Setting Row ---
function SettingRow({
  title, description, right, last = false, onClick,
}: {
  title: string; description?: string; right?: React.ReactNode; last?: boolean; onClick?: () => void
}): React.ReactElement {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 44, padding: '0 16px', gap: 12,
        borderBottom: last ? 'none' : '0.33px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: description ? '10px 0' : 0 }}>
        <div style={{ fontSize: 17, color: 'white', fontWeight: 400 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      {right}
    </div>
  )
}

// --- iOS Settings Group ---
function SettingsGroup({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden',
      marginBottom: 24,
    }}>
      {children}
    </div>
  )
}

type PanelTab = 'display' | 'theme' | 'shortcut' | 'ai'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'display',  label: '화면' },
  { id: 'theme',    label: '테마' },
  { id: 'shortcut', label: '단축키' },
  { id: 'ai',       label: 'AI' },
]

export default function SettingsPanel(): React.ReactElement {
  const { hubSize, overlayOpacity, spiralScale, animSpeed, autoScan, setAutoScan, setDisplay } = useAppStore()
  const currentTheme = useTheme()
  const [tab, setTab] = useState<PanelTab>('display')

  // ── Display state ──
  const [localHub, setLocalHub] = useState(hubSize)
  const [localOpacity, setLocalOpacity] = useState(Math.round(overlayOpacity * 100))
  const [localSpiral, setLocalSpiral] = useState(Math.round(spiralScale * 100))
  const [localAnim, setLocalAnim] = useState(animSpeed)
  const [loginItem, setLoginItem] = useState(false)

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
    setDisplay(patch)
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

  // ── iOS-style input ──
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, fontSize: 17, padding: '0 16px',
    background: 'rgba(255,255,255,0.06)', color: 'white',
    border: 'none', borderRadius: 10, boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#000' }}>
      {/* Segmented Control */}
      <div style={{ flexShrink: 0, padding: '12px 16px 0' }}>
        <div role="tablist" aria-label="설정 탭" style={{
          display: 'flex', gap: 0,
          background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 2,
        }}>
          {TABS.map(t => {
            const isActive = tab === t.id
            return (
              <button key={t.id} role="tab" aria-selected={isActive} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, minWidth: 0,
                  padding: 0,
                  cursor: 'pointer', border: 'none',
                  borderRadius: 8,
                  background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.50)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  lineHeight: 1,
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  minHeight: 30,
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div role="tabpanel" id={`tabpanel-${tab}`} style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      }}>

        {/* ════ DISPLAY TAB ════ */}
        {tab === 'display' && (
          <div>
            <SectionHeader>디스플레이</SectionHeader>
            <div style={{ marginBottom: 24 }}>
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
            </div>

            <SectionHeader>애니메이션 속도</SectionHeader>
            <SettingsGroup>
              <div style={{ padding: 2 }}>
                <div style={{ display: 'flex', background: 'transparent', borderRadius: 8, padding: 0 }}>
                  {(['slow', 'normal', 'fast', 'none'] as const).map(s => (
                    <button key={s} onClick={() => { setLocalAnim(s); saveDisplay({ animSpeed: s }) }}
                      style={{
                        flex: 1, padding: 0, minHeight: 36, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: localAnim === s ? 600 : 400,
                        border: 'none',
                        background: localAnim === s ? 'rgba(255,255,255,0.10)' : 'transparent',
                        color: localAnim === s ? 'white' : 'rgba(255,255,255,0.50)',
                        transition: 'all 0.2s ease',
                      }}>
                      {s === 'slow' ? '천천히' : s === 'normal' ? '보통' : s === 'fast' ? '빠르게' : '없음'}
                    </button>
                  ))}
                </div>
              </div>
            </SettingsGroup>

            <SectionHeader>기본 설정</SectionHeader>
            <SettingsGroup>
              <SettingRow
                title="자동 실행"
                description="로그인 시 자동 시작"
                right={
                  <ToggleSwitch on={loginItem} onToggle={async () => {
                    const next = !loginItem
                    setLoginItem(next)
                    const result = await window.api.appCtrl.setLoginItem(next).catch(() => null)
                    if (!result?.success) setLoginItem(!next)
                  }} />
                }
              />
              <SettingRow
                title="자동 AI 분석"
                description="메뉴 열 때 화면 분석"
                last
                right={
                  <ToggleSwitch on={autoScan} onToggle={() => setAutoScan(!autoScan)} />
                }
              />
            </SettingsGroup>

            <div style={{ textAlign: 'center' }}>
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
                  color: '#0a84ff',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '12px 0',
                }}
              >
                기본값으로 재설정
              </button>
            </div>
          </div>
        )}

        {/* ════ THEME TAB ════ */}
        {tab === 'theme' && (() => {
          const current = currentTheme
          return (
            <div>
              <SectionHeader>테마 선택</SectionHeader>
              <SettingsGroup>
                {THEME_PRESETS.map((t, i) => {
                  const active = current.id === t.id
                  return (
                    <div key={t.id}
                      onClick={() => setTheme(t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        minHeight: 44, padding: '0 16px', cursor: 'pointer',
                        borderBottom: i < THEME_PRESETS.length - 1 ? '0.33px solid rgba(255,255,255,0.06)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 17, color: 'white', fontWeight: 400 }}>{t.name}</span>
                      </div>
                      {active && (
                        <span style={{ fontSize: 17, color: '#0a84ff', fontWeight: 600 }}>&#10003;</span>
                      )}
                    </div>
                  )
                })}
              </SettingsGroup>

              {/* Preview */}
              <SectionHeader>미리보기</SectionHeader>
              <SettingsGroup>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      border: `2px solid ${current.primary}`, background: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: current.accent, fontFamily: current.titleFont }}>GS</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: current.accent, marginBottom: 2 }}>Gesellschaft</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Book, Clock and Tools</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
                    <div style={{ flex: 1, background: current.primary, borderRadius: 2 }} />
                    <div style={{ flex: 1, background: current.accent, borderRadius: 2 }} />
                    <div style={{ flex: 1, background: `linear-gradient(90deg, ${current.primary}, ${current.accent})`, borderRadius: 2 }} />
                  </div>
                </div>
              </SettingsGroup>
            </div>
          )
        })()}

        {/* ════ SHORTCUT TAB ════ */}
        {tab === 'shortcut' && (
          <div>
            <SectionHeader>현재 단축키</SectionHeader>
            <SettingsGroup>
              <div style={{ minHeight: 44, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
                <KeyBadge keys={currentShortcut} color={T.gold} />
              </div>
            </SettingsGroup>

            <SectionHeader>새 단축키</SectionHeader>
            <SettingsGroup>
              <div
                ref={recorderRef} tabIndex={0}
                onClick={() => { setRecording(true); setShortcutStatus(null) }}
                style={{
                  minHeight: 44, padding: '0 16px', outline: 'none',
                  cursor: recording ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  background: recording ? 'rgba(255,165,0,0.06)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {recording
                  ? <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>키 조합을 입력하세요...</span>
                  : <KeyBadge keys={pendingShortcut || currentShortcut} color={T.gold} inline />
                }
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                  {recording ? '입력 대기 중' : '클릭하여 변경'}
                </span>
              </div>
              {recording && (
                <div style={{ padding: '0 16px 10px' }}>
                  <button onClick={() => setRecording(false)} style={{
                    fontSize: 13, color: '#0a84ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                    취소
                  </button>
                </div>
              )}
            </SettingsGroup>

            {shortcutStatus && <StatusMsg ok={shortcutStatus.ok} msg={shortcutStatus.msg} />}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <button
                onClick={handleSaveShortcut}
                disabled={savingShortcut || recording || !shortcutChanged}
                style={{
                  padding: '10px 44px', borderRadius: 10, border: 'none', fontSize: 17, fontWeight: 400,
                  background: (savingShortcut || recording || !shortcutChanged) ? 'rgba(255,255,255,0.06)' : '#0a84ff',
                  color: (savingShortcut || recording || !shortcutChanged) ? 'rgba(255,255,255,0.35)' : 'white',
                  cursor: (savingShortcut || recording || !shortcutChanged) ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {savingShortcut ? '저장 중...' : '저장'}
              </button>
            </div>

            <SectionHeader>앱 내 단축키</SectionHeader>
            {([
              { label: '일반', items: [['Esc', '닫기 / 뒤로가기'], ['?', '단축키 도움말']] as [string, string][] },
              { label: '메뉴 탐색', items: [['← →', '이전 / 다음 도구'], ['Home', '첫 번째 도구 (A)'], ['End', '마지막 도구 (Z)'], ['↑ ↓', '전체 보기 토글'], ['Enter', '도구 선택'], ['스크롤', '도구 회전']] as [string, string][] },
              { label: '검색', items: [['텍스트 입력', '도구 이름으로 필터'], ['카테고리 클릭', '분류별 필터']] as [string, string][] },
            ]).map(section => (
              <div key={section.label} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase', paddingLeft: 16, marginBottom: 6,
                }}>
                  {section.label}
                </div>
                <SettingsGroup>
                  {section.items.map(([key, desc], i) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      minHeight: 44, padding: '0 16px',
                      borderBottom: i < section.items.length - 1 ? '0.33px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <kbd style={{
                        fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.60)',
                        fontFamily: 'ui-monospace, "SF Mono", monospace',
                        background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6,
                        minWidth: 50, textAlign: 'center',
                      }}>{key}</kbd>
                      <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.35)' }}>{desc}</span>
                    </div>
                  ))}
                </SettingsGroup>
              </div>
            ))}
          </div>
        )}

        {/* ════ AI TAB ════ */}
        {tab === 'ai' && (
          <div>
            {aiLoading && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, textAlign: 'center', paddingTop: 60 }}>불러오는 중...</div>
            )}
            {!aiLoading && aiConfig && (
              <>
                <SectionHeader>AI 제공자</SectionHeader>
                <SettingsGroup>
                  <div style={{ padding: 2 }}>
                    <div style={{ display: 'flex', borderRadius: 8 }}>
                      {(['openai', 'anthropic', 'ollama'] as const).map(p => (
                        <button key={p}
                          onClick={() => setAiDraft(d => ({ ...d, provider: p, model: '' }))}
                          style={{
                            flex: 1, padding: 0, minHeight: 36, borderRadius: 8, cursor: 'pointer', fontSize: 13,
                            fontWeight: aiProvider === p ? 600 : 400,
                            border: 'none',
                            background: aiProvider === p ? 'rgba(255,255,255,0.10)' : 'transparent',
                            color: aiProvider === p ? 'white' : 'rgba(255,255,255,0.50)',
                            transition: 'all 0.2s ease',
                          }}>
                          {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Ollama'}
                        </button>
                      ))}
                    </div>
                  </div>
                </SettingsGroup>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingLeft: 16, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>모델</span>
                    {aiProvider === 'ollama' && (
                      <button onClick={loadOllamaModels} style={{ fontSize: 13, color: '#0a84ff', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        새로고침
                      </button>
                    )}
                  </div>
                  {aiModels.length > 0 ? (
                    <select value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      style={selectStyle}>
                      {aiModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      placeholder={aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'anthropic' ? 'claude-sonnet-4-5' : '모델명 입력...'}
                      style={inputStyle} />
                  )}
                </div>

                {aiProvider !== 'ollama' && (
                  <div style={{ marginBottom: 24 }}>
                    <SectionHeader>API 키</SectionHeader>
                    <input type="password" value={aiDraft.apiKeyRaw ?? ''}
                      onChange={e => setAiDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                      placeholder={aiConfig.apiKey ? `현재: ••••${aiConfig.apiKey.slice(-4)}` : 'API 키를 입력하세요...'}
                      style={inputStyle} />
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6, paddingLeft: 16 }}>
                      비워두면 기존 키가 유지됩니다.
                      {aiProvider === 'openai' && ' OpenAI 대시보드에서 발급하세요.'}
                      {aiProvider === 'anthropic' && ' Anthropic Console에서 발급하세요.'}
                    </div>
                  </div>
                )}

                {aiProvider === 'ollama' && (
                  <div style={{ marginBottom: 24 }}>
                    <SectionHeader>Ollama 서버 URL</SectionHeader>
                    <input value={aiDraft.ollamaUrl ?? ''} onChange={e => setAiDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                      placeholder="http://localhost:11434"
                      style={inputStyle} />
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <SectionHeader>시스템 프롬프트</SectionHeader>
                  <textarea value={aiDraft.systemPrompt ?? ''} onChange={e => setAiDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                    rows={4} placeholder="AI의 역할이나 응답 방식을 지정합니다. 비워두면 기본값 사용."
                    style={{
                      ...inputStyle,
                      height: 'auto', minHeight: 100, padding: '12px 16px',
                      resize: 'vertical', lineHeight: 1.5,
                    }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={handleSaveAiConfig} style={{
                    padding: '10px 44px', borderRadius: 10, border: 'none', fontSize: 17, fontWeight: 400, cursor: 'pointer',
                    background: aiSaved ? 'rgba(48,209,88,0.15)' : '#0a84ff',
                    color: aiSaved ? '#30d158' : 'white',
                    transition: 'all 0.2s ease',
                  }}>
                    {aiSaved ? '저장됨' : '저장'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
