import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Match { text: string; index: number; groups: string[] }

export default function RegexTesterModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [pattern, setPattern] = useState('\\b\\w+\\b')
  const [flags, setFlags] = useState('gi')
  const [testStr, setTestStr] = useState('Hello World! 안녕하세요. test123')
  const [replaceMode, setReplaceMode] = useState(false)
  const [replaceStr, setReplaceStr] = useState('')

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f)
  }

  const { matches, error, highlighted, replaced } = useMemo(() => {
    if (!pattern) return { matches: [], error: null, highlighted: testStr, replaced: '' }
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const ms: Match[] = []
      let m: RegExpExecArray | null
      const re2 = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      while ((m = re2.exec(testStr)) !== null) {
        ms.push({ text: m[0], index: m.index, groups: m.slice(1) })
        if (!flags.includes('g')) break
      }
      // highlighted
      let parts: React.ReactNode[] = []
      let lastIdx = 0
      const re3 = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      let m2: RegExpExecArray | null
      let key = 0
      while ((m2 = re3.exec(testStr)) !== null) {
        if (m2.index > lastIdx) parts.push(<span key={key++}>{testStr.slice(lastIdx, m2.index)}</span>)
        parts.push(<span key={key++} style={{ background: 'rgba(99,102,241,0.4)', borderRadius: 2, padding: '0 1px' }}>{m2[0]}</span>)
        lastIdx = m2.index + m2[0].length
        if (!flags.includes('g')) break
      }
      if (lastIdx < testStr.length) parts.push(<span key={key++}>{testStr.slice(lastIdx)}</span>)

      const rep = replaceMode ? testStr.replace(re, replaceStr) : ''
      return { matches: ms, error: null, highlighted: parts, replaced: rep }
    } catch (e) {
      return { matches: [], error: (e as Error).message, highlighted: testStr, replaced: '' }
    }
  }, [pattern, flags, testStr, replaceMode, replaceStr])

  return (
    <Modal title="정규식 테스터" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* pattern */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 16, color: 'var(--win-text-muted)' }}>/</span>
          <input className="win-input" value={pattern} onChange={e => setPattern(e.target.value)} placeholder="정규식 패턴" style={{ flex: 1, fontFamily: 'monospace', fontSize: 14 }} />
          <span style={{ fontSize: 16, color: 'var(--win-text-muted)' }}>/</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {['g', 'i', 'm'].map(f => (
              <button key={f} onClick={() => toggleFlag(f)} style={{
                width: 28, height: 28, borderRadius: 6, border: flags.includes(f) ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--win-border)',
                background: flags.includes(f) ? 'rgba(99,102,241,0.2)' : 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: flags.includes(f) ? T.teal : 'var(--win-text-muted)', fontFamily: 'monospace',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: T.danger, padding: '6px 10px', background: rgba(T.danger, 0.1), borderRadius: 6 }}>{error}</div>}

        {/* replace */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--win-text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={replaceMode} onChange={e => setReplaceMode(e.target.checked)} style={{ accentColor: T.gold }} />
            치환 모드
          </label>
          {replaceMode && (
            <input className="win-input" value={replaceStr} onChange={e => setReplaceStr(e.target.value)} placeholder="치환 문자열" style={{ flex: 1, fontFamily: 'monospace' }} />
          )}
        </div>

        {/* test string */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-sub)' }}>테스트 문자열</label>
            <textarea className="win-textarea" value={testStr} onChange={e => setTestStr(e.target.value)} style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-sub)' }}>
              {replaceMode ? '치환 결과' : '매칭 하이라이트'}
            </label>
            <div style={{
              flex: 1, overflowY: 'auto', padding: 10, background: 'var(--win-surface-2)', borderRadius: 8,
              border: '1px solid var(--win-border)', fontFamily: 'monospace', fontSize: 13, color: 'var(--win-text)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {replaceMode ? replaced : highlighted}
            </div>
          </div>
        </div>

        {/* matches list */}
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: rgba(T.fg, 0.5), marginBottom: 4 }}>매칭 결과: {matches.length}개</div>
          {matches.length === 0 && !error && <div style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>매칭 없음</div>}
          {matches.slice(0, 50).map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '3px 0', borderBottom: `1px solid ${rgba(T.fg, 0.04)}`, fontSize: 12 }}>
              <span style={{ color: 'var(--win-text-muted)', width: 30 }}>#{i + 1}</span>
              <span style={{ color: T.teal, fontFamily: 'monospace', fontWeight: 600 }}>"{m.text}"</span>
              <span style={{ color: 'var(--win-text-muted)' }}>@{m.index}</span>
              {m.groups.length > 0 && <span style={{ color: 'var(--win-text-muted)' }}>그룹: {m.groups.map((g, j) => `$${j + 1}="${g}"`).join(', ')}</span>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
