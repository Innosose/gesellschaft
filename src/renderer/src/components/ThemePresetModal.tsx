import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba, THEME_PRESETS } from '../utils/theme'

interface Theme { id: string; name: string; color: string; bg: string; accent: string; desc: string }

const THEME_DESCS: Record<string, string> = {
  ruina: '고서의 향기가 감도는 도서관',
  crimson: '불꽃이 이글거리는 밤',
  violet: '몽환적인 보랏빛 꿈',
  arctic: '차가운 북극의 고요함',
  emerald: '울창한 숲 속 자연',
  rose: '로맨틱한 장미빛',
  mono: '클래식한 흑백 톤',
  sunset: '따뜻한 노을빛',
}

const THEMES: Theme[] = THEME_PRESETS.map(p => ({
  id: p.id,
  name: p.name,
  color: p.primary,
  bg: `linear-gradient(135deg, ${p.bg}, ${p.surface}, ${p.bg})`,
  accent: p.accent,
  desc: THEME_DESCS[p.id] || p.name,
}))

export default function ThemePresetModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)

  const applyTheme = useCallback((theme: Theme) => {
    try {
      (window as unknown as { api?: { settings?: { setTheme?: (c: string) => void } } }).api?.settings?.setTheme?.(theme.color)
    } catch { /* ignore */ }
    setApplied(theme.id)
    setTimeout(() => setApplied(null), 2000)
  }, [])

  return (
    <Modal title="테마 프리셋" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <div style={{ fontSize: 12, color: 'var(--win-text-muted)', lineHeight: 1.5 }}>
          원하는 테마를 선택하고 적용하세요. 각 테마는 앱의 전체 색상을 변경합니다.
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {THEMES.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id === selected ? null : t.id)}
              style={{
                borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                border: `2px solid ${selected === t.id ? t.color : 'var(--win-border)'}`,
                transform: selected === t.id ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Preview */}
              <div style={{ background: t.bg, padding: 16, minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                {/* Mini UI preview */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: T.danger }} />
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: T.warning }} />
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: T.success }} />
                </div>
                <div style={{ height: 6, borderRadius: 3, background: t.color, width: '60%', marginBottom: 4, opacity: 0.6 }} />
                <div style={{ height: 4, borderRadius: 2, background: rgba(T.fg, 0.15), width: '80%', marginBottom: 3 }} />
                <div style={{ height: 4, borderRadius: 2, background: rgba(T.fg, 0.1), width: '40%' }} />
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <div style={{ padding: '2px 8px', borderRadius: 4, background: t.color, fontSize: 8, color: '#000', fontWeight: 700 }}>BTN</div>
                  <div style={{ padding: '2px 8px', borderRadius: 4, background: rgba(T.fg, 0.1), fontSize: 8, color: rgba(T.fg, 0.5) }}>BTN</div>
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: '10px 14px', background: 'var(--win-surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: t.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--win-text)' }}>{t.name}</span>
                  {applied === t.id && <span style={{ fontSize: 10, color: T.success, marginLeft: 'auto' }}>적용됨!</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{t.desc}</div>
                {selected === t.id && (
                  <button className="win-btn-primary" onClick={e => { e.stopPropagation(); applyTheme(t) }}
                    style={{ fontSize: 12, marginTop: 8, width: '100%', background: t.color, color: '#000' }}>
                    적용하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
