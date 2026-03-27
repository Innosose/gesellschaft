import React, { useEffect, useRef, useState } from 'react'
import { rgba, THEMES } from '../utils/color'

interface DisplaySettings {
  hubSize: number
  overlayOpacity: number
  spiralScale: number
  animSpeed: 'slow' | 'normal' | 'fast'
}

interface SettingsProps {
  hubColor: string
  hubSize: number
  overlayOpacity: number
  spiralScale: number
  animSpeed: 'slow' | 'normal' | 'fast'
  onClose: () => void
  onThemeChange: (color: string) => void
  onDisplayChange: (patch: Partial<DisplaySettings>) => void
}

// Key → Electron accelerator mapping
const KEY_MAP: Record<string, string> = {
  ' ': 'Space', 'Enter': 'Return', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
  'ArrowUp': 'Up', 'ArrowDown': 'Down', 'Escape': 'Escape', 'Tab': 'Tab',
  'Backspace': 'Backspace', 'Delete': 'Delete', 'Insert': 'Insert',
  'Home': 'Home', 'End': 'End', 'PageUp': 'PageUp', 'PageDown': 'PageDown',
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
  const key = KEY_MAP[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)
  return parts.join('+')
}

type Tab = 'theme' | 'display' | 'shortcut' | 'ai'

// --- Slider helper ---
function Slider({
  label, value, min, max, step = 1, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void
}): React.ReactElement {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontFamily: 'monospace' }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--gs-accent, #8b5cf6)', cursor: 'pointer', height: 4 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{format(min)}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{format(max)}</span>
      </div>
    </div>
  )
}

export default function ShortcutSettings({
  hubColor, hubSize, overlayOpacity, spiralScale, animSpeed,
  onClose, onThemeChange, onDisplayChange,
}: SettingsProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('theme')

  // ── Drag state ──
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return
    e.preventDefault()
    const rect = (e.currentTarget.closest('[data-modal]') as HTMLElement).getBoundingClientRect()
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top }
    const onMove = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      setPos({ x: dragRef.current.originX + ev.clientX - dragRef.current.startX, y: dragRef.current.originY + ev.clientY - dragRef.current.startY })
    }
    const onUp = (): void => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Theme state ──
  const [selectedColor, setSelectedColor] = useState(hubColor)
  const [customColor, setCustomColor] = useState(hubColor)

  // ── Display state ──
  const [localHub, setLocalHub] = useState(hubSize)
  const [localOpacity, setLocalOpacity] = useState(Math.round(overlayOpacity * 100))
  const [localSpiral, setLocalSpiral] = useState(Math.round(spiralScale * 100))
  const [localAnim, setLocalAnim] = useState(animSpeed)
  const [loginItem, setLoginItem] = useState(false)

  // ── Shortcut state ──
  const [currentShortcut, setCurrentShortcut] = useState('...')
  const [pendingShortcut, setPendingShortcut] = useState('')
  const [recording, setRecording] = useState(false)
  const [shortcutStatus, setShortcutStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [savingShortcut, setSavingShortcut] = useState(false)
  const recorderRef = useRef<HTMLDivElement>(null)

  // ── AI state ──
  const [aiConfig, setAiConfig] = useState<Record<string, string> | null>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, string>>({})
  const [presetModels, setPresetModels] = useState<Record<string, string[]>>({})
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [aiSaving, setAiSaving] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    window.api.settings.getShortcut().then(s => { setCurrentShortcut(s); setPendingShortcut(s) })
    window.api.appCtrl.getLoginItem().then(setLoginItem)
  }, [])

  useEffect(() => {
    if (tab !== 'ai') return
    window.api.ai.getConfig().then(cfg => { setAiConfig(cfg as Record<string, string>); setAiDraft(cfg as Record<string, string>) })
    window.api.ai.getPresetModels().then(setPresetModels)
  }, [tab])

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
  const handleThemeSelect = async (color: string): Promise<void> => {
    setSelectedColor(color); setCustomColor(color)
    await window.api.settings.setTheme(color)
    onThemeChange(color)
  }

  const saveDisplay = async (patch: Partial<{ hubSize: number; overlayOpacity: number; spiralScale: number; animSpeed: string }>): Promise<void> => {
    await window.api.settings.setDisplay(patch as Record<string, unknown>)
    onDisplayChange(patch as Partial<DisplaySettings>)
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

  const handleSaveAi = async (): Promise<void> => {
    setAiSaving(true); setAiStatus(null)
    await window.api.ai.setConfig(aiDraft as Record<string, unknown>)
    setAiSaving(false)
    setAiStatus({ ok: true, msg: '저장되었습니다.' })
    setTimeout(() => setAiStatus(null), 2500)
  }

  const loadOllama = async (): Promise<void> => {
    setOllamaModels([])
    const models = await window.api.ai.getOllamaModels()
    setOllamaModels(models)
    if (models.length === 0) setAiStatus({ ok: false, msg: 'Ollama가 실행 중이 아니거나 연결 불가' })
    else setAiStatus({ ok: true, msg: `모델 ${models.length}개 발견` })
  }

  const shortcutChanged = pendingShortcut !== currentShortcut && pendingShortcut !== ''
  const provider = aiDraft.provider ?? aiConfig?.provider ?? 'openai'
  const availableModels = provider === 'ollama' ? ollamaModels : (presetModels[provider] ?? [])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'theme',    label: '테마' },
    { id: 'display',  label: '화면' },
    { id: 'shortcut', label: '단축키' },
    { id: 'ai',       label: 'AI 연결' },
  ]

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div
        data-modal
        style={{
          position: 'fixed',
          ...(pos ? { left: pos.x, top: pos.y } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
          zIndex: 201, width: 500, maxHeight: '88vh',
          borderRadius: 16, border: `1px solid ${rgba(hubColor, 0.28)}`,
          background: 'rgba(10,8,22,0.98)',
          boxShadow: `0 0 80px ${rgba(hubColor, 0.1)}, 0 28px 70px rgba(0,0,0,0.75)`,
          animation: 'panelSlideIn 0.25s cubic-bezier(0.2,0,0,1) both',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={handleDragStart}
          style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, cursor: 'grab', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>⚙ 게젤샤프트 설정</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', background: 'transparent',
                color: tab === t.id ? hubColor : 'rgba(255,255,255,0.35)',
                borderBottom: tab === t.id ? `2px solid ${hubColor}` : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                letterSpacing: '0.02em',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ════ THEME TAB ════ */}
          {tab === 'theme' && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 18, lineHeight: 1.6 }}>
                허브 및 전체 UI 강조 색상을 선택합니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
                {THEMES.map(theme => {
                  const isSel = selectedColor === theme.color
                  return (
                    <button key={theme.id} onClick={() => handleThemeSelect(theme.color)} title={theme.name}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                        border: isSel ? `2px solid ${theme.color}` : '2px solid rgba(255,255,255,0.07)',
                        background: isSel ? rgba(theme.color, 0.12) : 'rgba(255,255,255,0.03)',
                        transition: 'all 0.15s ease',
                        boxShadow: isSel ? `0 0 18px ${rgba(theme.color, 0.28)}` : 'none',
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${theme.color}, ${rgba(theme.color, 0.5)})`,
                        boxShadow: isSel ? `0 0 12px ${rgba(theme.color, 0.6)}` : '0 2px 6px rgba(0,0,0,0.4)',
                      }} />
                      <span style={{ fontSize: 9, color: isSel ? theme.color : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                        {theme.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Custom picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', marginBottom: 18 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>커스텀 색상</span>
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  onBlur={() => handleThemeSelect(customColor)}
                  style={{ width: 36, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', width: 72 }}>{customColor.toUpperCase()}</span>
                <button onClick={() => handleThemeSelect(customColor)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${rgba(hubColor, 0.4)}`, background: rgba(hubColor, 0.12), color: rgba(hubColor, 0.95), fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  적용
                </button>
              </div>

              {/* Preview */}
              <div style={{ padding: '14px 18px', borderRadius: 10, border: `1px solid ${rgba(selectedColor, 0.18)}`, background: rgba(selectedColor, 0.04) }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>미리보기</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: `2px solid ${rgba(selectedColor, 0.75)}`,
                    background: `radial-gradient(circle at 40% 35%, ${rgba(selectedColor, 0.28)}, rgba(10,8,22,0.95))`,
                    boxShadow: `0 0 22px ${rgba(selectedColor, 0.32)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {/* Inline book icon */}
                    <svg width="26" height="22" viewBox="0 0 50 41" fill="none">
                      <path d="M25 4 C19 4 9 6.5 3 10.5 L3 36 C9 33 19 32 25 33 Z"
                        fill={rgba(selectedColor, 0.28)} stroke={selectedColor} strokeWidth="2" strokeLinejoin="round" />
                      <path d="M25 4 C31 4 41 6.5 47 10.5 L47 36 C41 33 31 32 25 33 Z"
                        fill={rgba(selectedColor, 0.16)} stroke={selectedColor} strokeWidth="2" strokeLinejoin="round" />
                      <line x1="25" y1="4" x2="25" y2="33" stroke={selectedColor} strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="7"  y1="16" x2="21" y2="15"   stroke={selectedColor} strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
                      <line x1="7"  y1="22" x2="21" y2="21"   stroke={selectedColor} strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
                      <line x1="29" y1="15" x2="43" y2="16"   stroke={selectedColor} strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
                      <line x1="29" y1="21" x2="43" y2="22"   stroke={selectedColor} strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: selectedColor, marginBottom: 4 }}>게젤샤프트</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>바탕화면 AI 어시스턴트</div>
                  </div>
                  <div style={{ padding: '5px 12px', borderRadius: 14, border: `1px solid ${rgba(selectedColor, 0.4)}`, background: rgba(selectedColor, 0.1), fontSize: 10, fontWeight: 700, color: selectedColor }}>
                    ✦ AI 추천
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ DISPLAY TAB ════ */}
          {tab === 'display' && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 22, lineHeight: 1.6 }}>
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
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 10 }}>애니메이션 속도</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['slow', 'normal', 'fast'] as const).map(s => (
                    <button key={s} onClick={() => { setLocalAnim(s); saveDisplay({ animSpeed: s }) }}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        border: localAnim === s ? `2px solid ${hubColor}` : '2px solid rgba(255,255,255,0.1)',
                        background: localAnim === s ? rgba(hubColor, 0.15) : 'rgba(255,255,255,0.03)',
                        color: localAnim === s ? hubColor : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.15s ease',
                      }}>
                      {s === 'slow' ? '천천히' : s === 'normal' ? '보통' : '빠르게'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Startup settings */}
              <div style={{ marginTop: 8, marginBottom: 18, padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>기본 설정</div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>Windows 시작 시 자동 실행</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>로그인 시 게젤샤프트가 자동으로 시작됩니다</div>
                  </div>
                  <button
                    onClick={async () => {
                      const next = !loginItem
                      setLoginItem(next)
                      await window.api.appCtrl.setLoginItem(next)
                    }}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none',
                      background: loginItem ? hubColor : 'rgba(255,255,255,0.12)',
                      cursor: 'pointer', position: 'relative', flexShrink: 0,
                      transition: 'background 0.2s ease',
                      boxShadow: loginItem ? `0 0 10px ${rgba(hubColor, 0.4)}` : 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                      background: 'white', transition: 'left 0.2s ease',
                      left: loginItem ? 23 : 3,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </label>
              </div>

              {/* Reset to best-visibility defaults */}
              <button
                onClick={() => {
                  const BEST = { hubSize: 130, overlayOpacity: 0.91, spiralScale: 1.05, animSpeed: 'normal' as const }
                  setLocalHub(BEST.hubSize)
                  setLocalOpacity(Math.round(BEST.overlayOpacity * 100))
                  setLocalSpiral(Math.round(BEST.spiralScale * 100))
                  setLocalAnim(BEST.animSpeed)
                  saveDisplay(BEST)
                  handleThemeSelect('#8b5cf6')
                }}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: rgba(hubColor, 0.85),
                  background: rgba(hubColor, 0.08),
                  border: `1px solid ${rgba(hubColor, 0.28)}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  transition: 'all 0.15s ease',
                }}
              >
                ✦ 최적 시인성으로 초기화
              </button>
            </div>
          )}

          {/* ════ SHORTCUT TAB ════ */}
          {tab === 'shortcut' && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 18, lineHeight: 1.6 }}>
                오버레이를 표시/숨기는 글로벌 단축키입니다. Ctrl, Alt, Shift 중 하나 이상 + 키 조합이 필요합니다.
              </p>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>현재 단축키</div>
                <KeyBadge keys={currentShortcut} color={hubColor} />
              </div>

              <div style={{ marginBottom: shortcutStatus ? 14 : 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>새 단축키</div>
                <div
                  ref={recorderRef} tabIndex={0}
                  onClick={() => { setRecording(true); setShortcutStatus(null) }}
                  style={{
                    padding: '14px 18px', borderRadius: 10, outline: 'none',
                    cursor: recording ? 'default' : 'pointer',
                    border: recording ? `2px solid ${rgba(hubColor, 0.8)}` : shortcutChanged ? '2px solid rgba(99,174,120,0.55)' : '1.5px solid rgba(255,255,255,0.1)',
                    background: recording ? rgba(hubColor, 0.07) : 'rgba(255,255,255,0.03)',
                    boxShadow: recording ? `0 0 20px ${rgba(hubColor, 0.12)}` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {recording
                    ? <span style={{ fontSize: 12, color: rgba(hubColor, 0.8), fontStyle: 'italic' }}>키 조합을 입력하세요...</span>
                    : <KeyBadge keys={pendingShortcut || currentShortcut} color={hubColor} inline />
                  }
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>
                    {recording ? '입력 대기 중' : '클릭하여 변경'}
                  </span>
                </div>
                {recording && (
                  <button onClick={() => setRecording(false)} style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    취소
                  </button>
                )}
              </div>

              {shortcutStatus && <StatusMsg ok={shortcutStatus.ok} msg={shortcutStatus.msg} />}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <GhostBtn onClick={onClose}>닫기</GhostBtn>
                <AccentBtn color={hubColor} disabled={savingShortcut || recording || !shortcutChanged} onClick={handleSaveShortcut}>
                  {savingShortcut ? '저장 중...' : '저장'}
                </AccentBtn>
              </div>
            </div>
          )}

          {/* ════ AI TAB ════ */}
          {tab === 'ai' && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20, lineHeight: 1.6 }}>
                AI 기능(채팅, 화면 분석)에 사용할 공급자와 API 키를 설정합니다.
              </p>

              {/* Provider */}
              <div style={{ marginBottom: 16 }}>
                <Label>공급자</Label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {(['openai', 'anthropic', 'ollama'] as const).map(p => {
                    const names: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', ollama: 'Ollama (로컬)' }
                    const isSel = provider === p
                    return (
                      <button key={p} onClick={() => setAiDraft(d => ({ ...d, provider: p, model: '' }))}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          border: isSel ? `2px solid ${hubColor}` : '2px solid rgba(255,255,255,0.1)',
                          background: isSel ? rgba(hubColor, 0.14) : 'rgba(255,255,255,0.03)',
                          color: isSel ? hubColor : 'rgba(255,255,255,0.5)',
                          transition: 'all 0.15s ease',
                        }}>
                        {names[p]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Ollama URL */}
              {provider === 'ollama' && (
                <div style={{ marginBottom: 16 }}>
                  <Label>Ollama URL</Label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input className="win-input" value={aiDraft.ollamaUrl ?? 'http://localhost:11434'}
                      onChange={e => setAiDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
                      placeholder="http://localhost:11434"
                      style={{ fontSize: 12, height: 34 }} />
                    <button onClick={loadOllama}
                      style={{ padding: '0 14px', borderRadius: 8, border: `1px solid ${rgba(hubColor, 0.4)}`, background: rgba(hubColor, 0.1), color: rgba(hubColor, 0.9), fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      연결 확인
                    </button>
                  </div>
                </div>
              )}

              {/* API Key */}
              {provider !== 'ollama' && (
                <div style={{ marginBottom: 16 }}>
                  <Label>API 키 {aiConfig?.apiKey ? <span style={{ color: 'rgba(34,197,94,0.8)', fontSize: 10 }}>● 저장됨</span> : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>● 미설정</span>}</Label>
                  <input className="win-input" type="password"
                    value={aiDraft.apiKeyRaw ?? ''}
                    onChange={e => setAiDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
                    placeholder="sk-... 또는 sk-ant-... (저장 후 마스킹됨)"
                    style={{ marginTop: 8, fontSize: 12, height: 34 }} />
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
                    키는 로컬 파일에만 저장되며 외부로 전송되지 않습니다.
                  </p>
                </div>
              )}

              {/* Model */}
              <div style={{ marginBottom: 16 }}>
                <Label>모델</Label>
                {availableModels.length > 0 ? (
                  <select className="win-select" value={aiDraft.model ?? ''} onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                    style={{ marginTop: 8, fontSize: 12, height: 34, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)' }}>
                    <option value="">모델 선택...</option>
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input className="win-input" value={aiDraft.model ?? ''}
                    onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                    placeholder={provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-sonnet-4-6' : '모델명 입력'}
                    style={{ marginTop: 8, fontSize: 12, height: 34 }} />
                )}
              </div>

              {/* System prompt */}
              <div style={{ marginBottom: 18 }}>
                <Label>시스템 프롬프트</Label>
                <textarea className="win-textarea"
                  value={aiDraft.systemPrompt ?? ''}
                  onChange={e => setAiDraft(d => ({ ...d, systemPrompt: e.target.value }))}
                  rows={3} style={{ marginTop: 8, fontSize: 12 }} />
              </div>

              {aiStatus && <StatusMsg ok={aiStatus.ok} msg={aiStatus.msg} />}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <GhostBtn onClick={onClose}>닫기</GhostBtn>
                <AccentBtn color={hubColor} disabled={aiSaving} onClick={handleSaveAi}>
                  {aiSaving ? '저장 중...' : '저장'}
                </AccentBtn>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ── Small reusable sub-components ──

function Label({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</div>
}

function StatusMsg({ ok, msg }: { ok: boolean; msg: string }): React.ReactElement {
  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12,
      background: ok ? 'rgba(34,197,94,0.09)' : 'rgba(239,68,68,0.09)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
      color: ok ? 'rgba(134,239,172,0.9)' : 'rgba(252,165,165,0.9)',
    }}>
      {msg}
    </div>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button onClick={onClick} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

function AccentBtn({ onClick, disabled, color, children }: { onClick: () => void; disabled?: boolean; color: string; children: React.ReactNode }): React.ReactElement {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
      background: disabled ? rgba(color, 0.22) : rgba(color, 0.88),
      color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
      cursor: disabled ? 'default' : 'pointer', transition: 'background 0.12s ease',
    }}>
      {children}
    </button>
  )
}

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
          {i < parts.length - 1 && <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}
