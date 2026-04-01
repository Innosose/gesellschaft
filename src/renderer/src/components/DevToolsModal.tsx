import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'

// ── 탭 정의 ─────────────────────────────────────────────────────────────────
type DevTab = 'json' | 'base64' | 'url' | 'hash' | 'jwt' | 'timestamp'

const TABS: { id: DevTab; label: string }[] = [
  { id: 'json',      label: 'JSON' },
  { id: 'base64',    label: 'Base64' },
  { id: 'url',       label: 'URL' },
  { id: 'hash',      label: 'Hash' },
  { id: 'jwt',       label: 'JWT' },
  { id: 'timestamp', label: 'Timestamp' },
]

// ── 공통 복사 버튼 ─────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="win-btn-secondary text-xs"
      style={{ padding: '3px 10px' }}
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  )
}

// ── JSON 탭 ─────────────────────────────────────────────────────────────────
function JsonTab(): React.ReactElement {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState(2)

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, indent))
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setOutput('')
    }
  }, [input, indent])

  const minify = useCallback(() => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setOutput('')
    }
  }, [input])

  return (
    <div className="space-y-3">
      <textarea
        className="win-textarea w-full font-mono text-xs"
        rows={7}
        placeholder="JSON을 붙여넣으세요…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'ui-monospace, monospace' }}
      />
      <div className="flex gap-2 items-center">
        <button className="win-btn-primary text-xs" onClick={format}>포맷</button>
        <button className="win-btn-secondary text-xs" onClick={minify}>축소</button>
        <label className="text-xs" style={{ color: 'var(--win-text-muted)' }}>
          들여쓰기&nbsp;
          <select
            className="win-select"
            value={indent}
            onChange={e => setIndent(Number(e.target.value))}
            style={{ width: 56, padding: '2px 6px', fontSize: 11 }}
          >
            {[2, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--win-danger)' }}>{error}</p>}
      {output && (
        <div className="relative">
          <pre
            className="text-xs p-3 rounded overflow-auto"
            style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', maxHeight: 200, fontFamily: 'ui-monospace, monospace' }}
          >{output}</pre>
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <CopyBtn text={output} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Base64 탭 ────────────────────────────────────────────────────────────────
function Base64Tab(): React.ReactElement {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError]   = useState('')

  const encode = (): void => {
    try { setOutput(btoa(unescape(encodeURIComponent(input)))); setError('') }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setOutput('') }
  }
  const decode = (): void => {
    try { setOutput(decodeURIComponent(escape(atob(input)))); setError('') }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setOutput('') }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="win-textarea w-full text-xs"
        rows={4}
        placeholder="인코딩할 텍스트 또는 Base64 문자열…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ fontFamily: 'ui-monospace, monospace' }}
      />
      <div className="flex gap-2">
        <button className="win-btn-primary text-xs" onClick={encode}>인코딩 →</button>
        <button className="win-btn-secondary text-xs" onClick={decode}>← 디코딩</button>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--win-danger)' }}>{error}</p>}
      {output && (
        <div className="relative">
          <textarea
            className="win-textarea w-full text-xs"
            rows={3}
            readOnly
            value={output}
            style={{ fontFamily: 'ui-monospace, monospace' }}
          />
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <CopyBtn text={output} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── URL 탭 ──────────────────────────────────────────────────────────────────
function UrlTab(): React.ReactElement {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const encode = (): void => setOutput(encodeURIComponent(input))
  const decode = (): void => {
    try { setOutput(decodeURIComponent(input)) }
    catch { setOutput('디코딩 실패: 유효하지 않은 URL 인코딩') }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="win-textarea w-full text-xs"
        rows={4}
        placeholder="URL 인코딩/디코딩할 문자열…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ fontFamily: 'ui-monospace, monospace' }}
      />
      <div className="flex gap-2">
        <button className="win-btn-primary text-xs" onClick={encode}>인코딩 →</button>
        <button className="win-btn-secondary text-xs" onClick={decode}>← 디코딩</button>
      </div>
      {output && (
        <div className="relative">
          <textarea
            className="win-textarea w-full text-xs"
            rows={3}
            readOnly
            value={output}
            style={{ fontFamily: 'ui-monospace, monospace' }}
          />
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <CopyBtn text={output} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hash 탭 ─────────────────────────────────────────────────────────────────
type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

async function hashText(text: string, algo: HashAlgo): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest(algo, enc.encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function HashTab(): React.ReactElement {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<Record<HashAlgo, string>>({} as Record<HashAlgo, string>)
  const [loading, setLoading] = useState(false)
  const algos: HashAlgo[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

  const compute = async (): Promise<void> => {
    if (!input) return
    setLoading(true)
    const entries = await Promise.all(algos.map(async a => [a, await hashText(input, a)] as const))
    setResults(Object.fromEntries(entries) as Record<HashAlgo, string>)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <textarea
        className="win-textarea w-full text-xs"
        rows={3}
        placeholder="해시를 계산할 텍스트…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ fontFamily: 'ui-monospace, monospace' }}
      />
      <button className="win-btn-primary text-xs" onClick={compute} disabled={loading}>
        {loading ? '계산 중…' : '해시 계산'}
      </button>
      {algos.map(algo => results[algo] && (
        <div key={algo} className="space-y-1">
          <div className="text-xs" style={{ color: 'var(--win-text-muted)' }}>{algo}</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs p-2 rounded" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {results[algo]}
            </code>
            <CopyBtn text={results[algo]} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── JWT 탭 ──────────────────────────────────────────────────────────────────
function decodeJwt(token: string): { header: unknown; payload: unknown; error?: string } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { header: null, payload: null, error: '유효한 JWT가 아닙니다 (세 부분이 필요)' }
    const decode = (s: string): unknown => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')))
    return { header: decode(parts[0]), payload: decode(parts[1]) }
  } catch {
    return { header: null, payload: null, error: '디코딩 실패: 유효하지 않은 토큰' }
  }
}

function JwtTab(): React.ReactElement {
  const [input, setInput] = useState('')
  const [decoded, setDecoded] = useState<{ header: unknown; payload: unknown; error?: string } | null>(null)

  const decode = (): void => setDecoded(decodeJwt(input.trim()))

  const JwtSection = ({ label, data }: { label: string; data: unknown }): React.ReactElement => (
    <div>
      <div className="text-xs mb-1" style={{ color: 'var(--win-text-muted)' }}>{label}</div>
      <pre className="text-xs p-3 rounded overflow-auto" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', maxHeight: 130, fontFamily: 'ui-monospace, monospace' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )

  return (
    <div className="space-y-3">
      <textarea
        className="win-textarea w-full text-xs"
        rows={4}
        placeholder="JWT 토큰을 붙여넣으세요…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ fontFamily: 'ui-monospace, monospace' }}
      />
      <button className="win-btn-primary text-xs" onClick={decode}>디코딩</button>
      {decoded?.error && (
        <p className="text-xs" style={{ color: 'var(--win-danger)' }}>{decoded.error}</p>
      )}
      {decoded && !decoded.error && (
        <div className="space-y-3">
          <JwtSection label="헤더" data={decoded.header} />
          <JwtSection label="페이로드" data={decoded.payload} />
          <p className="text-xs" style={{ color: 'rgba(255,200,80,0.75)' }}>⚠️ 서명은 검증되지 않습니다. 내용 확인 전용입니다.</p>
        </div>
      )}
    </div>
  )
}

// ── Timestamp 탭 ─────────────────────────────────────────────────────────────
function TimestampTab(): React.ReactElement {
  const [unixInput, setUnixInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [unixResult, setUnixResult] = useState('')
  const [dateResult, setDateResult] = useState('')

  const unixToDate = (): void => {
    const n = Number(unixInput)
    if (isNaN(n)) { setDateResult('유효하지 않은 숫자'); return }
    // Unix 초 or 밀리초 자동 판별
    const ms = unixInput.length <= 10 ? n * 1000 : n
    setDateResult(new Date(ms).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ` (KST)\n${new Date(ms).toISOString()} (ISO)`)
  }

  const dateToUnix = (): void => {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) { setUnixResult('유효하지 않은 날짜'); return }
    setUnixResult(`${Math.floor(d.getTime() / 1000)}  (초)\n${d.getTime()}  (밀리초)`)
  }

  const nowUnix = (): void => {
    const now = Date.now()
    setUnixInput(String(now))
    const d = new Date(now)
    setDateResult(d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ` (KST)\n${d.toISOString()} (ISO)`)
  }

  return (
    <div className="space-y-4">
      {/* Unix → Date */}
      <div className="space-y-2">
        <div className="text-xs" style={{ color: 'var(--win-text-muted)' }}>Unix Timestamp → 날짜</div>
        <div className="flex gap-2">
          <input
            className="win-input flex-1 text-xs"
            placeholder="Unix 타임스탬프 (초 또는 밀리초)…"
            value={unixInput}
            onChange={e => setUnixInput(e.target.value)}
          />
          <button className="win-btn-primary text-xs" onClick={unixToDate}>변환</button>
          <button className="win-btn-secondary text-xs" onClick={nowUnix}>지금</button>
        </div>
        {dateResult && (
          <pre className="text-xs p-2 rounded" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>
            {dateResult}
          </pre>
        )}
      </div>

      {/* Date → Unix */}
      <div className="space-y-2">
        <div className="text-xs" style={{ color: 'var(--win-text-muted)' }}>날짜 → Unix Timestamp</div>
        <div className="flex gap-2">
          <input
            className="win-input flex-1 text-xs"
            placeholder="날짜 문자열 (예: 2025-01-01 09:00:00)…"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
          />
          <button className="win-btn-primary text-xs" onClick={dateToUnix}>변환</button>
        </div>
        {unixResult && (
          <div className="flex items-center gap-2">
            <pre className="flex-1 text-xs p-2 rounded" style={{ background: 'var(--win-bg)', border: '1px solid var(--win-surface)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>
              {unixResult}
            </pre>
            <CopyBtn text={unixResult} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
interface DevToolsModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function DevToolsModal({ onClose, asPanel }: DevToolsModalProps): React.ReactElement {
  const [tab, setTab] = useState<DevTab>('json')

  return (
    <Modal title="🛠 개발자 도구" onClose={onClose} asPanel={asPanel}>
      {/* 탭 헤더 */}
      <div className="flex gap-1 flex-wrap mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === t.id ? 'bg-[#00bcd4] text-white' : ''}`}
            style={tab !== t.id ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'json'      && <JsonTab />}
      {tab === 'base64'    && <Base64Tab />}
      {tab === 'url'       && <UrlTab />}
      {tab === 'hash'      && <HashTab />}
      {tab === 'jwt'       && <JwtTab />}
      {tab === 'timestamp' && <TimestampTab />}
    </Modal>
  )
}
