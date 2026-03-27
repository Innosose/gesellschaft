import React, { useEffect, useRef, useState } from 'react'
import { rgba, THEMES } from '../utils/color'
import { useAppStore } from '../store/appStore'

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
          {i < parts.length - 1 && <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>+</span>}
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
      background: ok ? 'rgba(34,197,94,0.09)' : 'rgba(239,68,68,0.09)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
      color: ok ? 'rgba(134,239,172,0.9)' : 'rgba(252,165,165,0.9)',
    }}>
      {msg}
    </div>
  )
}

type PanelTab = 'theme' | 'display' | 'shortcut'

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: 'theme',    icon: '🎨', label: '테마' },
  { id: 'display',  icon: '🖥',  label: '화면' },
  { id: 'shortcut', icon: '⌨️', label: '단축키' },
]

export default function SettingsPanel(): React.ReactElement {
  const { hubColor, hubSize, overlayOpacity, spiralScale, animSpeed, setHubColor, setDisplay } = useAppStore()
  const [tab, setTab] = useState<PanelTab>('theme')

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

  useEffect(() => {
    window.api.settings.getShortcut().then(s => { setCurrentShortcut(s); setPendingShortcut(s) })
    window.api.appCtrl.getLoginItem().then(setLoginItem)
  }, [])

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
  const handleThemeSelect = (color: string): void => {
    setSelectedColor(color); setCustomColor(color)
    setHubColor(color) // Zustand: API 저장 + CSS 변수 업데이트
  }

  const saveDisplay = (patch: Partial<{ hubSize: number; overlayOpacity: number; spiralScale: number; animSpeed: 'slow' | 'normal' | 'fast' }>): void => {
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

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{
        width: 180,
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '0 20px',
          marginBottom: 12,
        }}>
          설정
        </div>
        {TABS.map(t => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: '100%',
                padding: '10px 20px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                cursor: 'pointer',
                border: 'none',
                borderRight: isActive ? `2px solid ${hubColor}` : '2px solid transparent',
                background: isActive ? rgba(hubColor, 0.12) : 'none',
                color: isActive ? hubColor : 'rgba(255,255,255,0.45)',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

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
              <button
                onClick={handleSaveShortcut}
                disabled={savingShortcut || recording || !shortcutChanged}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                  background: (savingShortcut || recording || !shortcutChanged) ? rgba(hubColor, 0.22) : rgba(hubColor, 0.88),
                  color: (savingShortcut || recording || !shortcutChanged) ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: (savingShortcut || recording || !shortcutChanged) ? 'default' : 'pointer',
                  transition: 'background 0.12s ease',
                }}
              >
                {savingShortcut ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
