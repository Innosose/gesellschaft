import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

function generatePassword(length: number, upper: boolean, lower: boolean, digits: boolean, symbols: boolean): string {
  let charset = ''
  if (upper) charset += UPPER
  if (lower) charset += LOWER
  if (digits) charset += DIGITS
  if (symbols) charset += SYMBOLS
  if (!charset) charset = LOWER
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, v => charset[v % charset.length]).join('')
}

function getStrength(pw: string): { label: string; color: string; pct: number } {
  let score = 0
  if (pw.length >= 12) score += 2; else if (pw.length >= 8) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1
  if (pw.length >= 20) score += 1
  if (score <= 1) return { label: '약함', color: T.danger, pct: 20 }
  if (score <= 2) return { label: '보통', color: T.warning, pct: 40 }
  if (score <= 3) return { label: '양호', color: T.warning, pct: 60 }
  if (score <= 4) return { label: '강함', color: T.success, pct: 80 }
  return { label: '매우 강함', color: T.success, pct: 100 }
}

export default function PasswordGenModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [length, setLength] = useState(16)
  const [upper, setUpper] = useState(true)
  const [lower, setLower] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const generate = useCallback(() => {
    const pw = generatePassword(length, upper, lower, digits, symbols)
    setPassword(pw)
    setCopied(false)
    setHistory(p => [pw, ...p].slice(0, 10))
  }, [length, upper, lower, digits, symbols])

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }, [])

  const strength = useMemo(() => password ? getStrength(password) : null, [password])

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--win-text)' }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ accentColor: T.gold }} />
      {label}
    </label>
  )

  return (
    <Modal title="비밀번호 생성기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* length slider */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 6, display: 'block' }}>길이: {length}</label>
          <input type="range" min={8} max={64} value={length} onChange={e => setLength(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--win-text-muted)' }}><span>8</span><span>64</span></div>
        </div>

        {/* toggles */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Toggle label="대문자 (A-Z)" value={upper} onChange={setUpper} />
          <Toggle label="소문자 (a-z)" value={lower} onChange={setLower} />
          <Toggle label="숫자 (0-9)" value={digits} onChange={setDigits} />
          <Toggle label="특수문자 (!@#)" value={symbols} onChange={setSymbols} />
        </div>

        <button className="win-btn-primary" onClick={generate} style={{ alignSelf: 'flex-start' }}>생성하기</button>

        {/* result */}
        {password && (
          <div style={{ padding: 16, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 16, color: T.teal, wordBreak: 'break-all', marginBottom: 10, letterSpacing: 1 }}>{password}</div>
            {strength && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--win-text-muted)' }}>강도</span>
                  <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: rgba(T.fg, 0.1) }}>
                  <div style={{ height: '100%', width: `${strength.pct}%`, borderRadius: 2, background: strength.color, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
            <button className="win-btn-secondary" onClick={() => copy(password)} style={{ fontSize: 12, color: copied ? T.success : undefined }}>
              {copied ? '복사됨 ✓' : '클립보드에 복사'}
            </button>
          </div>
        )}

        {/* history */}
        {history.length > 1 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>최근 생성 기록</div>
            {history.slice(1).map((pw, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${rgba(T.fg, 0.05)}` }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: 'var(--win-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pw}</span>
                <button onClick={() => copy(pw)} style={{ background: 'none', border: 'none', color: T.teal, cursor: 'pointer', fontSize: 10 }}>복사</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
