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

// e.code → Electron accelerator key mapping
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
  if (CODE_MAP[code]) key = CODE_MAP[code]
  else if (/^Key[A-Z]$/.test(code)) key = code.slice(3)
  else if (/^Digit[0-9]$/.test(code)) key = code.slice(5)
  else if (/^F\d+$/.test(code)) key = code
  else key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(key)
  return parts.join('+')
}

/* ─── macOS System Settings 색상 토큰 (다크 모드) ── */
const C = {
  bg: '#1e1e1e',
  sidebar: '#2a2a2a',
  sidebarHover: 'rgba(255,255,255,0.06)',
  sidebarActive: '#0a84ff',
  card: '#2a2a2a',
  cardBorder: 'rgba(255,255,255,0.06)',
  separator: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.35)',
  accent: '#0a84ff',
  green: '#30d158',
  red: '#ff453a',
  chevron: 'rgba(255,255,255,0.25)',
} as const

/* ─── 사이드바 메뉴 정의 ── */
type MenuId = 'display' | 'theme' | 'shortcut' | 'ai'
interface MenuItem { id: MenuId; icon: string; label: string; color: string }

const MENU_ITEMS: MenuItem[] = [
  { id: 'display',  icon: '🖥', label: '디스플레이',  color: '#5856d6' },
  { id: 'theme',    icon: '🎨', label: '테마',        color: '#ff9f0a' },
  { id: 'shortcut', icon: '⌨️', label: '단축키',      color: '#64d2ff' },
  { id: 'ai',       icon: '🤖', label: 'AI',          color: '#bf5af2' },
]

/* ═══════════════ 공통 컴포넌트 ═══════════════ */

function GroupCard({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      background: C.card, borderRadius: 10,
      border: `0.5px solid ${C.cardBorder}`,
      overflow: 'hidden', marginBottom: 20,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      fontSize: 13, color: C.textTertiary, fontWeight: 400,
      paddingLeft: 2, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function Row({
  icon, title, description, right, last = false, onClick,
}: {
  icon?: string; title: string; description?: string
  right?: React.ReactNode; last?: boolean; onClick?: () => void
}): React.ReactElement {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        minHeight: 44, padding: '6px 12px',
        borderBottom: last ? 'none' : `0.5px solid ${C.separator}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)') }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon && <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0, padding: description ? '2px 0' : 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>{title}</div>
        {description && <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{description}</div>}
      </div>
      {right}
    </div>
  )
}

function Chevron(): React.ReactElement {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
      <path d="M1 1l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }): React.ReactElement {
  return (
    <button onClick={onToggle} style={{
      width: 40, height: 24, borderRadius: 12, border: 'none',
      background: on ? C.green : 'rgba(255,255,255,0.16)',
      cursor: 'pointer', position: 'relative', flexShrink: 0,
      transition: 'background 0.2s ease',
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
        left: on ? 18 : 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function Slider({
  label, value, min, max, step = 1, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void
}): React.ReactElement {
  return (
    <div style={{ padding: '8px 12px', borderBottom: `0.5px solid ${C.separator}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.text }}>{label}</span>
        <span style={{ fontSize: 12, color: C.textTertiary, fontVariantNumeric: 'tabular-nums' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: C.accent }} />
    </div>
  )
}

function KeyBadge({ keys }: { keys: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {keys.split('+').map((k, i) => (
        <React.Fragment key={k}>
          <span style={{
            padding: '3px 8px', borderRadius: 5,
            fontFamily: 'ui-monospace, "SF Mono", monospace',
            fontSize: 12, fontWeight: 500,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.60)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}>{k}</span>
          {i < keys.split('+').length - 1 && <span style={{ color: C.textTertiary, fontSize: 9 }}>+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}

function StatusMsg({ ok, msg }: { ok: boolean; msg: string }): React.ReactElement {
  return (
    <div style={{
      marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12,
      background: ok ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
      color: ok ? C.green : C.red,
    }}>{msg}</div>
  )
}

/* ═══════════════ 메인 패널 ═══════════════ */

export default function SettingsPanel(): React.ReactElement {
  const { hubSize, overlayOpacity, spiralScale, animSpeed, autoScan, setAutoScan, setDisplay } = useAppStore()
  const currentTheme = useTheme()
  const [activeMenu, setActiveMenu] = useState<MenuId>('display')

  // ── Display
  const [localHub, setLocalHub] = useState(hubSize)
  const [localOpacity, setLocalOpacity] = useState(Math.round(overlayOpacity * 100))
  const [localSpiral, setLocalSpiral] = useState(Math.round(spiralScale * 100))
  const [localAnim, setLocalAnim] = useState(animSpeed)
  const [loginItem, setLoginItem] = useState(false)

  useEffect(() => {
    setLocalHub(hubSize); setLocalOpacity(Math.round(overlayOpacity * 100))
    setLocalSpiral(Math.round(spiralScale * 100)); setLocalAnim(animSpeed)
  }, [hubSize, overlayOpacity, spiralScale, animSpeed])

  // ── Shortcut
  const [currentShortcut, setCurrentShortcut] = useState('...')
  const [pendingShortcut, setPendingShortcut] = useState('')
  const [recording, setRecording] = useState(false)
  const [shortcutStatus, setShortcutStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [savingShortcut, setSavingShortcut] = useState(false)
  const recorderRef = useRef<HTMLDivElement>(null)

  // ── AI
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
    if (activeMenu !== 'ai' || aiConfig !== null) return
    setAiLoading(true)
    window.api.ai.getConfig().then(cfg => { setAiConfig(cfg); setAiDraft({ ...cfg }) }).finally(() => setAiLoading(false))
    window.api.ai.getPresetModels().then(setAiPresetModels).catch(() => {})
  }, [activeMenu, aiConfig])

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
      setShortcutStatus({ ok: true, msg: '저장되었습니다.' })
    } else {
      setShortcutStatus({ ok: false, msg: res.error ?? '저장 실패' })
    }
  }

  const handleSaveAiConfig = async (): Promise<void> => {
    try {
      await window.api.ai.setConfig(aiDraft as Record<string, unknown>)
      const updated = await window.api.ai.getConfig()
      setAiConfig(updated); setAiDraft({ ...updated })
      setAiSaved(true); setTimeout(() => setAiSaved(false), 2000)
    } catch { /* */ }
  }

  const loadOllamaModels = async (): Promise<void> => {
    try { setAiOllamaModels(await window.api.ai.getOllamaModels()) } catch { setAiOllamaModels([]) }
  }

  const aiProvider = (aiDraft.provider ?? aiConfig?.provider ?? '') as string
  const aiModels = aiProvider === 'ollama' ? aiOllamaModels : (aiPresetModels[aiProvider] ?? [])
  const shortcutChanged = pendingShortcut !== currentShortcut && pendingShortcut !== ''

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 32, fontSize: 13, padding: '0 10px',
    background: 'rgba(255,255,255,0.06)', color: 'white',
    border: `0.5px solid ${C.cardBorder}`, borderRadius: 6,
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  /* ═══════════════ 렌더링 ═══════════════ */
  return (
    <div style={{
      display: 'flex', flex: 1, overflow: 'hidden',
      background: C.bg,
    }}>

      {/* ══ 사이드바 ══ */}
      <div style={{
        width: 200, flexShrink: 0,
        background: C.sidebar,
        borderRight: `0.5px solid ${C.cardBorder}`,
        padding: '16px 8px',
        overflowY: 'auto',
        borderRadius: 0,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 700, color: C.text,
          padding: '0 10px', marginBottom: 20,
        }}>설정</div>

        {MENU_ITEMS.map(item => {
          const active = activeMenu === item.id
          return (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '6px 10px', marginBottom: 2,
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: active ? C.sidebarActive : 'transparent',
              color: active ? '#fff' : C.text,
              fontSize: 13, fontWeight: active ? 500 : 400,
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.sidebarHover }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 6,
                background: active ? 'rgba(255,255,255,0.2)' : item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </div>

      {/* ══ 콘텐츠 영역 ══ */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 24,
        minHeight: 0,
      }}>

        {/* ════ 디스플레이 ════ */}
        {activeMenu === 'display' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>디스플레이</div>
            <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 24 }}>허브 크기, 투명도, 애니메이션을 조정합니다.</div>

            <SectionLabel>크기 및 투명도</SectionLabel>
            <GroupCard>
              <Slider label="허브 크기" value={localHub} min={72} max={180} step={2}
                format={v => `${v}px`} onChange={v => { setLocalHub(v); saveDisplay({ hubSize: v }) }} />
              <Slider label="오버레이 불투명도" value={localOpacity} min={60} max={97}
                format={v => `${v}%`} onChange={v => { setLocalOpacity(v); saveDisplay({ overlayOpacity: v / 100 }) }} />
              <Slider label="나선 간격" value={localSpiral} min={60} max={160} step={5}
                format={v => `${v}%`} onChange={v => { setLocalSpiral(v); saveDisplay({ spiralScale: v / 100 }) }} />
            </GroupCard>

            <SectionLabel>애니메이션 속도</SectionLabel>
            <GroupCard>
              <div style={{ display: 'flex', padding: 4 }}>
                {(['slow', 'normal', 'fast', 'none'] as const).map(s => (
                  <button key={s} onClick={() => { setLocalAnim(s); saveDisplay({ animSpeed: s }) }}
                    style={{
                      flex: 1, padding: 0, minHeight: 28, borderRadius: 6,
                      cursor: 'pointer', fontSize: 12, fontWeight: localAnim === s ? 600 : 400,
                      border: 'none',
                      background: localAnim === s ? C.accent : 'transparent',
                      color: localAnim === s ? '#fff' : C.textSecondary,
                      transition: 'all 0.15s ease',
                    }}>
                    {s === 'slow' ? '천천히' : s === 'normal' ? '보통' : s === 'fast' ? '빠르게' : '없음'}
                  </button>
                ))}
              </div>
            </GroupCard>

            <SectionLabel>일반</SectionLabel>
            <GroupCard>
              <Row icon="🚀" title="자동 실행" description="로그인 시 자동 시작"
                right={<ToggleSwitch on={loginItem} onToggle={async () => {
                  const next = !loginItem; setLoginItem(next)
                  const result = await window.api.appCtrl.setLoginItem(next).catch(() => null)
                  if (!result?.success) setLoginItem(!next)
                }} />} />
              <Row icon="🔍" title="자동 AI 분석" description="메뉴 열 때 화면 자동 분석" last
                right={<ToggleSwitch on={autoScan} onToggle={() => setAutoScan(!autoScan)} />} />
            </GroupCard>

            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button onClick={() => {
                const D = { hubSize: 140, overlayOpacity: 0.92, spiralScale: 1.0, animSpeed: 'normal' as const }
                setLocalHub(D.hubSize); setLocalOpacity(Math.round(D.overlayOpacity * 100))
                setLocalSpiral(Math.round(D.spiralScale * 100)); setLocalAnim(D.animSpeed); saveDisplay(D)
              }} style={{ fontSize: 13, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                기본값으로 재설정
              </button>
            </div>
          </div>
        )}

        {/* ════ 테마 ════ */}
        {activeMenu === 'theme' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>테마</div>
            <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 24 }}>앱의 전체 분위기와 색상을 변경합니다.</div>

            <SectionLabel>테마 선택</SectionLabel>
            <GroupCard>
              {THEME_PRESETS.map((t, i) => {
                const active = currentTheme.id === t.id
                return (
                  <Row key={t.id} title={t.name} last={i === THEME_PRESETS.length - 1}
                    onClick={() => setTheme(t.id)}
                    icon={undefined}
                    right={active
                      ? <span style={{ color: C.accent, fontSize: 16, fontWeight: 600 }}>✓</span>
                      : <Chevron />
                    }
                    description={undefined}
                  />
                )
              })}
            </GroupCard>

            <SectionLabel>미리보기</SectionLabel>
            <GroupCard>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.accent})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${currentTheme.primary}40`,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', fontFamily: currentTheme.titleFont }}>GS</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{currentTheme.name}</div>
                    <div style={{ fontSize: 12, color: C.textTertiary }}>{currentTheme.titleFont.split(',')[0].replace(/'/g, '')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[currentTheme.primary, currentTheme.accent, currentTheme.fg, currentTheme.danger, currentTheme.success].map((c, i) => (
                    <div key={i} style={{
                      flex: 1, height: 28, borderRadius: 6,
                      background: c, border: `0.5px solid ${C.cardBorder}`,
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['primary', 'accent', 'fg', 'danger', 'success'].map(label => (
                    <div key={label} style={{ flex: 1, fontSize: 10, color: C.textTertiary, textAlign: 'center' }}>{label}</div>
                  ))}
                </div>
              </div>
            </GroupCard>
          </div>
        )}

        {/* ════ 단축키 ════ */}
        {activeMenu === 'shortcut' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>단축키</div>
            <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 24 }}>글로벌 단축키와 앱 내 키보드 조작을 설정합니다.</div>

            <SectionLabel>글로벌 단축키</SectionLabel>
            <GroupCard>
              <Row title="현재 단축키" right={<KeyBadge keys={currentShortcut} />} />
              <div ref={recorderRef} tabIndex={0}
                onClick={() => { setRecording(true); setShortcutStatus(null) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  minHeight: 44, padding: '6px 12px', cursor: 'pointer', outline: 'none',
                  background: recording ? 'rgba(255,165,0,0.06)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text }}>
                    {recording ? '키 조합을 입력하세요...' : '새 단축키'}
                  </div>
                  {!recording && pendingShortcut && pendingShortcut !== currentShortcut && (
                    <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>변경: {pendingShortcut}</div>
                  )}
                </div>
                {!recording && <KeyBadge keys={pendingShortcut || currentShortcut} />}
              </div>
              {recording && (
                <div style={{ padding: '4px 12px 8px' }}>
                  <button onClick={() => setRecording(false)}
                    style={{ fontSize: 12, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    취소
                  </button>
                </div>
              )}
            </GroupCard>

            {shortcutStatus && <StatusMsg ok={shortcutStatus.ok} msg={shortcutStatus.msg} />}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <button onClick={handleSaveShortcut}
                disabled={savingShortcut || recording || !shortcutChanged}
                style={{
                  padding: '6px 32px', borderRadius: 6, border: 'none',
                  fontSize: 13, fontWeight: 500, cursor: shortcutChanged ? 'pointer' : 'default',
                  background: shortcutChanged ? C.accent : 'rgba(255,255,255,0.06)',
                  color: shortcutChanged ? '#fff' : C.textTertiary,
                  transition: 'all 0.15s',
                }}>
                {savingShortcut ? '저장 중...' : '저장'}
              </button>
            </div>

            <SectionLabel>앱 내 단축키</SectionLabel>
            {([
              { label: '일반', items: [['Esc', '닫기 / 뒤로가기'], ['?', '단축키 도움말']] },
              { label: '메뉴', items: [['← →', '이전 / 다음 도구'], ['Home / End', '처음 / 마지막'], ['Enter', '도구 선택']] },
            ] as const).map(section => (
              <div key={section.label} style={{ marginBottom: 16 }}>
                <SectionLabel>{section.label}</SectionLabel>
                <GroupCard>
                  {section.items.map(([key, desc], i) => (
                    <Row key={key} title={desc as string} last={i === section.items.length - 1}
                      right={<KeyBadge keys={key as string} />} />
                  ))}
                </GroupCard>
              </div>
            ))}
          </div>
        )}

        {/* ════ AI ════ */}
        {activeMenu === 'ai' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>AI</div>
            <div style={{ fontSize: 13, color: C.textTertiary, marginBottom: 24 }}>AI 어시스턴트의 제공자, 모델, API 키를 설정합니다.</div>

            {aiLoading && <div style={{ color: C.textTertiary, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>불러오는 중...</div>}

            {!aiLoading && aiConfig && (
              <>
                <SectionLabel>제공자</SectionLabel>
                <GroupCard>
                  <div style={{ display: 'flex', padding: 4 }}>
                    {(['openai', 'anthropic', 'ollama'] as const).map(p => (
                      <button key={p} onClick={() => setAiDraft(d => ({ ...d, provider: p, model: '' }))}
                        style={{
                          flex: 1, padding: 0, minHeight: 28, borderRadius: 6,
                          cursor: 'pointer', fontSize: 12, fontWeight: aiProvider === p ? 600 : 400,
                          border: 'none',
                          background: aiProvider === p ? C.accent : 'transparent',
                          color: aiProvider === p ? '#fff' : C.textSecondary,
                          transition: 'all 0.15s',
                        }}>
                        {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Ollama'}
                      </button>
                    ))}
                  </div>
                </GroupCard>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <SectionLabel>모델</SectionLabel>
                    {aiProvider === 'ollama' && (
                      <button onClick={loadOllamaModels}
                        style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        새로고침
                      </button>
                    )}
                  </div>
                  {aiModels.length > 0 ? (
                    <select value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      style={{ ...inputStyle, appearance: 'none' as const }}>
                      {aiModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                      placeholder={aiProvider === 'openai' ? 'gpt-4o' : aiProvider === 'anthropic' ? 'claude-sonnet-4-5' : '모델명'}
                      style={inputStyle} />
                  )}
                </div>

                {aiProvider !== 'ollama' && (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel>API 키</SectionLabel>
                    <input type="password" value={aiDraft.apiKeyRaw ?? ''}
                      onChange={e => setAiDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                      placeholder={aiConfig.apiKey ? `현재: ${aiConfig.apiKey}` : 'API 키 입력'}
                      style={inputStyle} />
                    <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>
                      비워두면 기존 키가 유지됩니다.
                    </div>
                  </div>
                )}

                {aiProvider === 'ollama' && (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel>Ollama 서버</SectionLabel>
                    <input value={aiDraft.ollamaUrl ?? ''} onChange={e => setAiDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                      placeholder="http://localhost:11434" style={inputStyle} />
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <SectionLabel>시스템 프롬프트</SectionLabel>
                  <textarea value={aiDraft.systemPrompt ?? ''} onChange={e => setAiDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                    rows={4} placeholder="AI의 역할이나 응답 방식을 지정합니다."
                    style={{
                      ...inputStyle, height: 'auto', minHeight: 80, padding: '8px 10px',
                      resize: 'vertical', lineHeight: 1.5,
                    }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={handleSaveAiConfig} style={{
                    padding: '6px 32px', borderRadius: 6, border: 'none',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    background: aiSaved ? 'rgba(48,209,88,0.15)' : C.accent,
                    color: aiSaved ? C.green : '#fff',
                    transition: 'all 0.15s',
                  }}>
                    {aiSaved ? '저장됨 ✓' : '저장'}
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
