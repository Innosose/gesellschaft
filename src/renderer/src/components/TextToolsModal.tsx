import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'

type Tool = {
  label: string
  group: string
  fn: (text: string) => string
}

const TOOLS: Tool[] = [
  // 업무 서식
  { group: '업무 서식', label: '전화번호 포맷', fn: t => t.replace(/\D/g, '').replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3') },
  { group: '업무 서식', label: '사업자번호 포맷', fn: t => t.replace(/\D/g, '').replace(/^(\d{3})(\d{2})(\d{5})$/, '$1-$2-$3') },
  { group: '업무 서식', label: '금액 콤마 표시', fn: t => { const n = parseFloat(t.replace(/[,\s]/g, '')); return isNaN(n) ? t : n.toLocaleString('ko-KR') } },
  { group: '업무 서식', label: '금액 한글 변환', fn: t => {
    const n = parseInt(t.replace(/[,\s]/g, ''))
    if (isNaN(n) || n < 0) return t
    const units = ['', '만', '억', '조']
    const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
    if (n === 0) return '영원'
    let result = ''
    let num = n
    for (let i = 3; i >= 0; i--) {
      const unit = Math.pow(10000, i)
      const v = Math.floor(num / unit)
      if (v > 0) {
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 1000) % 10] : '') + (Math.floor(v / 1000) % 10 > 0 ? '천' : '')
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 100) % 10] : '') + (Math.floor(v / 100) % 10 > 0 ? '백' : '')
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 10) % 10] : '') + (Math.floor(v / 10) % 10 > 0 ? '십' : '')
        result += v % 10 > 0 ? digits[v % 10] : ''
        result += units[i]
      }
      num -= v * unit
    }
    return result + '원'
  }},
  { group: '업무 서식', label: '주민번호 마스킹', fn: t => t.replace(/(\d{6})-?(\d)\d{6}/, '$1-$2******') },
  { group: '업무 서식', label: '계좌번호 마스킹', fn: t => t.replace(/(\d{3,4})-?(\d{2,4})-?(\d{4,8})-?(\d{1,3})/, (_, a, b, c, d) => `${a}-${b}-${'*'.repeat(c.length)}-${d}`) },

  // 줄/공백 정리
  { group: '정리', label: '앞뒤 공백 제거', fn: t => t.split('\n').map(l => l.trim()).join('\n') },
  { group: '정리', label: '빈 줄 제거', fn: t => t.split('\n').filter(l => l.trim()).join('\n') },
  { group: '정리', label: '중복 줄 제거', fn: t => [...new Set(t.split('\n'))].join('\n') },
  { group: '정리', label: '연속 공백 정리', fn: t => t.split('\n').map(l => l.replace(/  +/g, ' ')).join('\n') },

  // 목록/순서
  { group: '목록', label: '번호 추가', fn: t => t.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') },
  { group: '목록', label: '번호 제거', fn: t => t.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '')).join('\n') },
  { group: '목록', label: '줄 정렬 (가나다)', fn: t => t.split('\n').sort((a, b) => a.localeCompare(b, 'ko')).join('\n') },
  { group: '목록', label: '줄 역순', fn: t => t.split('\n').reverse().join('\n') },

  // 대소문자
  { group: '대소문자', label: '대문자 변환', fn: t => t.toUpperCase() },
  { group: '대소문자', label: '소문자 변환', fn: t => t.toLowerCase() },
]

const GROUPS = [...new Set(TOOLS.map(t => t.group))]

function stats(text: string): string {
  const lines = text.split('\n').length
  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return `${lines}줄 · ${chars}자 · ${words}단어`
}

// ── 정규식 테스터 ────────────────────────────────────────────────────────────────

interface QuickPattern { label: string; pattern: string; flags: string }

const QUICK_PATTERNS: QuickPattern[] = [
  { label: '이메일',       pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]+',          flags: 'gi' },
  { label: '전화번호',     pattern: '0\\d{1,2}-?\\d{3,4}-?\\d{4}',          flags: 'g'  },
  { label: 'URL',          pattern: 'https?://[^\\s]+',                       flags: 'gi' },
  { label: '숫자',         pattern: '\\d+',                                   flags: 'g'  },
  { label: '한글',         pattern: '[가-힣]+',                               flags: 'g'  },
  { label: '영단어',       pattern: '[A-Za-z]+',                              flags: 'g'  },
  { label: '공백 여러 개', pattern: '\\s{2,}',                               flags: 'g'  },
  { label: 'IP 주소',      pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',      flags: 'g'  },
  { label: '날짜(YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}',              flags: 'g'  },
]

interface RegexMatch { index: number; length: number; value: string; groups: string[] }

function runRegex(pattern: string, flags: string, text: string): { matches: RegexMatch[]; error: string | null } {
  if (!pattern) return { matches: [], error: null }
  try {
    const re = new RegExp(pattern, flags)
    const matches: RegexMatch[] = []
    if (flags.includes('g')) {
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        matches.push({ index: m.index, length: m[0].length, value: m[0], groups: m.slice(1) })
        if (m[0].length === 0) re.lastIndex++  // prevent infinite loop on zero-width match
        if (matches.length >= 500) break
      }
    } else {
      const m = re.exec(text)
      if (m) matches.push({ index: m.index, length: m[0].length, value: m[0], groups: m.slice(1) })
    }
    return { matches, error: null }
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : '잘못된 정규식' }
  }
}

function RegexTab(): React.ReactElement {
  const [pattern, setPattern] = useState('')
  const [flagG, setFlagG] = useState(true)
  const [flagI, setFlagI] = useState(false)
  const [flagM, setFlagM] = useState(false)
  const [testStr, setTestStr] = useState('')
  const [copied, setCopied] = useState(false)

  const flags = `${flagG ? 'g' : ''}${flagI ? 'i' : ''}${flagM ? 'm' : ''}`
  const { matches, error } = useMemo(() => runRegex(pattern, flags, testStr), [pattern, flags, testStr])

  // Build highlighted HTML
  const highlighted = useMemo(() => {
    if (!matches.length || !testStr) return null
    const parts: { text: string; match: boolean }[] = []
    let cursor = 0
    for (const m of matches) {
      if (m.index > cursor) parts.push({ text: testStr.slice(cursor, m.index), match: false })
      parts.push({ text: testStr.slice(m.index, m.index + m.length), match: true })
      cursor = m.index + m.length
    }
    if (cursor < testStr.length) parts.push({ text: testStr.slice(cursor), match: false })
    return parts
  }, [matches, testStr])

  const copyResult = async (): Promise<void> => {
    if (!matches.length) return
    await navigator.clipboard.writeText(matches.map(m => m.value).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* 패턴 입력 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 16, color: 'var(--win-text-muted)', fontFamily: 'monospace', userSelect: 'none' }}>/</span>
        <input
          className="win-input"
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="정규식 패턴 입력..."
          spellCheck={false}
        />
        <span style={{ fontSize: 16, color: 'var(--win-text-muted)', fontFamily: 'monospace', userSelect: 'none' }}>/</span>
        {/* 플래그 */}
        {[
          { label: 'g', val: flagG, set: setFlagG, title: '전체 매칭' },
          { label: 'i', val: flagI, set: setFlagI, title: '대소문자 무시' },
          { label: 'm', val: flagM, set: setFlagM, title: '멀티라인' },
        ].map(f => (
          <button
            key={f.label}
            title={f.title}
            onClick={() => f.set(v => !v)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
              background: f.val ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.07)',
              color: f.val ? '#a78bfa' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.12s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '5px 10px', background: 'rgba(239,68,68,0.09)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠ {error}
        </div>
      )}

      {/* 빠른 패턴 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {QUICK_PATTERNS.map(q => (
          <button
            key={q.label}
            onClick={() => {
              setPattern(q.pattern)
              setFlagG(q.flags.includes('g'))
              setFlagI(q.flags.includes('i'))
              setFlagM(q.flags.includes('m'))
            }}
            style={{
              padding: '2px 9px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
              fontSize: 10, cursor: 'pointer', transition: 'all 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#a78bfa88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
        {/* 테스트 문자열 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>
            테스트 문자열
            {matches.length > 0 && !error && (
              <span style={{ marginLeft: 8, color: '#a78bfa', fontWeight: 700 }}>
                {matches.length}개 매칭
              </span>
            )}
          </span>
          {highlighted ? (
            <div
              className="win-input"
              style={{ flex: 1, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {highlighted.map((p, i) =>
                p.match
                  ? <mark key={i} style={{ background: 'rgba(167,139,250,0.35)', color: '#e9d5ff', borderRadius: 3, padding: '0 1px' }}>{p.text}</mark>
                  : <span key={i}>{p.text}</span>
              )}
            </div>
          ) : (
            <textarea
              className="win-input flex-1 resize-none"
              style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7 }}
              value={testStr}
              onChange={e => setTestStr(e.target.value)}
              placeholder="매칭할 텍스트를 입력하세요..."
              spellCheck={false}
            />
          )}
          {highlighted && (
            <textarea
              className="win-input resize-none"
              style={{ height: 60, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7 }}
              value={testStr}
              onChange={e => setTestStr(e.target.value)}
              placeholder="매칭할 텍스트를 입력하세요..."
              spellCheck={false}
            />
          )}
        </div>

        {/* 매칭 결과 */}
        <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>매칭 목록</span>
            <button
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${copied ? 'text-green-400' : ''}`}
              style={{ color: copied ? '#4ade80' : 'var(--win-text-muted)', fontSize: 10 }}
              onClick={copyResult}
              disabled={!matches.length}
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matches.length === 0 && !error && pattern && testStr && (
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', textAlign: 'center', marginTop: 20 }}>매칭 없음</div>
            )}
            {matches.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 8px', borderRadius: 5, background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.18)', fontSize: 11,
                  fontFamily: 'monospace', color: '#e9d5ff',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: m.groups.length ? 2 : 0 }}>
                  <span style={{ color: '#a78bfa', fontSize: 9, fontFamily: 'sans-serif' }}>#{i + 1} @{m.index}</span>
                </div>
                {m.value}
                {m.groups.length > 0 && m.groups.some(Boolean) && (
                  <div style={{ marginTop: 2, paddingTop: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {m.groups.map((g, gi) => g != null && (
                      <div key={gi} style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                        ${gi + 1}: {g}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────────

type Mode = '텍스트 변환' | '정규식'
const MODES: Mode[] = ['텍스트 변환', '정규식']

export default function TextToolsModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [mode, setMode]           = useState<Mode>('텍스트 변환')
  const [input, setInput]         = useState('')
  const [output, setOutput]       = useState('')
  const [copied, setCopied]       = useState(false)
  const [lastTool, setLastTool]   = useState('')
  const [activeGroup, setActiveGroup] = useState(GROUPS[0])

  const visibleTools = TOOLS.filter(t => t.group === activeGroup)

  const apply = (tool: Tool): void => {
    setOutput(tool.fn(output || input))
    setLastTool(tool.label)
    setCopied(false)
  }

  const copyOutput = async (): Promise<void> => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const swap = (): void => {
    setInput(output)
    setOutput('')
    setLastTool('')
  }

  return (
    <Modal title="텍스트 도구" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-3 h-[420px]">
        {/* 최상위 모드 전환 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ── 텍스트 변환 ── */}
        {mode === '텍스트 변환' && (
          <>
            {/* 그룹 탭 */}
            <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
              {GROUPS.map(group => (
                <button
                  key={group}
                  onClick={() => { setActiveGroup(group); setLastTool('') }}
                  style={{
                    padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    background: activeGroup === group ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: activeGroup === group ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >{group}</button>
              ))}
            </div>

            <div className="flex gap-3 flex-1 min-h-0">
              <div className="w-44 flex-shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
                {visibleTools.map(tool => (
                  <button
                    key={tool.label}
                    className="text-left text-xs px-2.5 py-1.5 rounded border transition-colors"
                    style={lastTool === tool.label
                      ? { borderColor: 'var(--win-accent)', background: 'var(--win-accent-dim)', color: '#60a0ff' }
                      : { borderColor: 'var(--win-surface-2)', color: 'var(--win-text-muted)' }
                    }
                    onMouseEnter={(e) => { if (lastTool !== tool.label) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--win-border)' } }}
                    onMouseLeave={(e) => { if (lastTool !== tool.label) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--win-surface-2)' } }}
                    onClick={() => apply(tool)}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>입력</span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--win-border)' }}>{input ? stats(input) : ''}</span>
                  </div>
                  <textarea
                    className="flex-1 win-input resize-none text-xs leading-relaxed"
                    value={input}
                    onChange={e => { setInput(e.target.value); setOutput(''); setLastTool('') }}
                    placeholder="변환할 텍스트를 입력하거나 붙여넣기..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="text-[10px] px-1"
                    style={{ color: 'var(--win-text-muted)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-sub)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                    onClick={swap}
                    disabled={!output}
                    title="출력을 입력으로"
                  >
                    ↕ 출력 → 입력
                  </button>
                  <button
                    className="text-[10px] px-1"
                    style={{ color: 'var(--win-text-muted)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-sub)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
                    onClick={() => { setInput(''); setOutput(''); setLastTool('') }}
                    disabled={!input && !output}
                  >
                    초기화
                  </button>
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>출력</span>
                    {lastTool && <span className="text-[10px]" style={{ color: 'var(--win-border)' }}>— {lastTool}</span>}
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--win-border)' }}>{output ? stats(output) : ''}</span>
                  </div>
                  <textarea
                    className="flex-1 win-input resize-none text-xs leading-relaxed"
                    value={output}
                    onChange={e => setOutput(e.target.value)}
                    placeholder="변환 결과가 여기에 표시됩니다..."
                  />
                </div>

                <button
                  className={`win-btn-primary text-xs transition-all ${copied ? 'bg-[#1e7e34]' : ''}`}
                  onClick={copyOutput}
                  disabled={!output}
                >
                  {copied ? '✓ 복사됨' : '출력 복사'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── 정규식 테스터 ── */}
        {mode === '정규식' && <RegexTab />}
      </div>
    </Modal>
  )
}
