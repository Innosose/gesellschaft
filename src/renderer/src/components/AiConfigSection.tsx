import React from 'react'
import { T, rgba } from '../utils/theme'
import type { AiConfig } from '../../../shared/types'

type Draft = Partial<AiConfig & { apiKeyRaw?: string }>

interface AiConfigSectionProps {
  config: AiConfig | null
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  loading: boolean
  saved: boolean
  models: string[]
  provider: string
  onSave: () => void
  onLoadOllamaModels: () => void
  dark?: boolean
}

/** AI 설정 탭 — 제공자 / 모델 / API 키 / Ollama URL / 시스템 프롬프트 */
export default function AiConfigSection({
  config, draft, setDraft, loading, saved,
  models, provider, onSave, onLoadOllamaModels, dark = false,
}: AiConfigSectionProps): React.ReactElement {
  const bg       = dark ? rgba(T.bg, 0.9)                : undefined
  const color    = dark ? rgba(T.fg, 0.85)       : 'var(--win-text)'
  const border   = dark ? `1px solid ${rgba(T.fg, 0.16)}` : '1px solid var(--win-border)'
  const labelColor = dark ? rgba(T.fg, 0.68)     : 'var(--win-text-muted)'
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 30, fontSize: 12,
    background: bg ?? 'var(--win-surface-2)',
    color, border, borderRadius: 6,
    padding: '0 8px', boxSizing: 'border-box',
  }
  const saveBtnStyle: React.CSSProperties = dark
    ? { height: 34, fontSize: 12, background: rgba(T.gold, 0.2), color: 'rgba(220,200,140,0.9)', border: `1px solid ${rgba(T.gold, 0.4)}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }
    : undefined

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: labelColor, fontSize: 12 }}>
        설정 로딩 중...
      </div>
    )
  }
  if (!config) return <></>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Provider */}
        <div>
          <label style={{ fontSize: 11, color: labelColor, display: 'block', marginBottom: 5 }}>AI 제공자</label>
          <select
            value={draft.provider ?? ''}
            onChange={e => setDraft(d => ({ ...d, provider: e.target.value, model: '' }))}
            style={inputStyle}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="ollama">Ollama (로컬)</option>
          </select>
        </div>

        {/* Model */}
        <div>
          <label style={{ fontSize: 11, color: labelColor, display: 'block', marginBottom: 5 }}>
            모델
            {provider === 'ollama' && (
              <button
                onClick={onLoadOllamaModels}
                style={{ marginLeft: 8, fontSize: 10, color: dark ? rgba(T.gold, 0.8) : 'var(--win-accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >새로고침</button>
            )}
          </label>
          {models.length > 0 ? (
            <select
              value={draft.model ?? ''}
              onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
              style={inputStyle}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input
              value={draft.model ?? ''}
              onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
              placeholder="모델명 입력..."
              style={inputStyle}
            />
          )}
        </div>

        {/* API Key */}
        {provider !== 'ollama' && (
          <div>
            <label style={{ fontSize: 11, color: labelColor, display: 'block', marginBottom: 5 }}>API 키</label>
            <input
              type="password"
              value={draft.apiKeyRaw ?? ''}
              onChange={e => setDraft(d => ({ ...d, apiKeyRaw: e.target.value }))}
              placeholder={config.apiKey ? `현재: ••••${config.apiKey.slice(-4)}` : '키 입력...'}
              style={inputStyle}
            />
            <div style={{ fontSize: 10, color: labelColor, marginTop: 3 }}>비워두면 기존 키 유지</div>
          </div>
        )}

        {/* Ollama URL */}
        {provider === 'ollama' && (
          <div>
            <label style={{ fontSize: 11, color: labelColor, display: 'block', marginBottom: 5 }}>Ollama URL</label>
            <input
              value={draft.ollamaUrl ?? ''}
              onChange={e => setDraft(d => ({ ...d, ollamaUrl: e.target.value }))}
              style={inputStyle}
            />
          </div>
        )}

        {/* System Prompt */}
        <div>
          <label style={{ fontSize: 11, color: labelColor, display: 'block', marginBottom: 5 }}>시스템 프롬프트</label>
          <textarea
            value={draft.systemPrompt ?? ''}
            onChange={e => setDraft(d => ({ ...d, systemPrompt: e.target.value }))}
            rows={4}
            style={{
              width: '100%', fontSize: 12, resize: 'vertical', padding: '6px 10px',
              lineHeight: 1.5, fontFamily: 'inherit',
              background: bg ?? 'var(--win-surface-2)',
              color, border, borderRadius: 6, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          className={saveBtnStyle ? undefined : 'win-btn-primary'}
          style={saveBtnStyle}
        >
          {saved ? '✓ 저장됨' : '설정 저장'}
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: labelColor, textAlign: 'center' }}>
        ⚙ 설정 패널 › AI 탭에서도 동일하게 설정할 수 있습니다.
      </div>
    </div>
  )
}
