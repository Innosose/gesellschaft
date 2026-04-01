import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function encryptText(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  const buf = new Uint8Array(salt.length + iv.length + ct.byteLength)
  buf.set(salt, 0); buf.set(iv, salt.length); buf.set(new Uint8Array(ct), salt.length + iv.length)
  return btoa(String.fromCharCode(...buf))
}

async function decryptText(b64: string, password: string): Promise<string> {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const salt = buf.slice(0, 16)
  const iv = buf.slice(16, 28)
  const ct = buf.slice(28)
  const key = await deriveKey(password, salt)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

type Mode = 'encrypt' | 'decrypt'

export default function EncryptToolModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [input, setInput] = useState('')
  const [password, setPassword] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const run = useCallback(async () => {
    if (!input.trim() || !password) { setError('텍스트와 비밀번호를 모두 입력하세요'); return }
    setError(''); setLoading(true)
    try {
      const result = mode === 'encrypt' ? await encryptText(input, password) : await decryptText(input.trim(), password)
      setOutput(result)
    } catch {
      setError(mode === 'decrypt' ? '복호화 실패: 비밀번호가 올바르지 않거나 데이터가 손상되었습니다' : '암호화 실패')
    }
    setLoading(false)
  }, [mode, input, password])

  const copy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }, [output])

  return (
    <Modal title="암호화 도구" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([{ id: 'encrypt' as Mode, label: '암호화' }, { id: 'decrypt' as Mode, label: '복호화' }]).map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setOutput(''); setError('') }} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: mode === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: mode === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>
            {mode === 'encrypt' ? '평문 텍스트' : '암호화된 텍스트 (Base64)'}
          </label>
          <textarea className="win-input" value={input} onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encrypt' ? '암호화할 텍스트를 입력...' : 'Base64 암호문을 붙여넣으세요...'}
            style={{ minHeight: 100, resize: 'none', fontFamily: 'monospace', fontSize: 12 }} />
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>비밀번호</label>
          <input className="win-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" style={{ width: '100%', marginTop: 4 }} />
        </div>

        <button className="win-btn-primary" onClick={run} disabled={loading} style={{ alignSelf: 'flex-start', fontSize: 12 }}>
          {loading ? '처리 중...' : mode === 'encrypt' ? '암호화' : '복호화'}
        </button>

        {error && <div style={{ color: T.danger, fontSize: 12 }}>{error}</div>}

        {output && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>결과</label>
              <button className="win-btn-secondary" onClick={copy} style={{ fontSize: 11, padding: '2px 10px', color: copied ? T.success : undefined }}>{copied ? '복사됨 ✓' : '복사'}</button>
            </div>
            <div style={{
              padding: 12, borderRadius: 8, background: 'var(--win-surface-2)', border: '1px solid var(--win-border)',
              fontFamily: 'monospace', fontSize: 12, color: T.teal, wordBreak: 'break-all', maxHeight: 150, overflowY: 'auto',
            }}>{output}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
