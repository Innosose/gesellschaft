import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const COLORS = {
  key: T.teal,
  string: T.teal,
  number: T.warning,
  boolean: T.danger,
  null: T.fg,
  bracket: rgba(T.fg, 0.4),
}

function JsonNode({ data, name, depth, defaultOpen }: { data: unknown; name?: string; depth: number; defaultOpen: boolean }): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)
  const indent = depth * 16

  if (data === null) return (
    <div style={{ paddingLeft: indent, fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
      {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
      <span style={{ color: COLORS.null }}>null</span>
    </div>
  )

  if (typeof data === 'string') return (
    <div style={{ paddingLeft: indent, fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
      {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
      <span style={{ color: COLORS.string }}>"{data}"</span>
    </div>
  )

  if (typeof data === 'number') return (
    <div style={{ paddingLeft: indent, fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
      {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
      <span style={{ color: COLORS.number }}>{data}</span>
    </div>
  )

  if (typeof data === 'boolean') return (
    <div style={{ paddingLeft: indent, fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
      {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
      <span style={{ color: COLORS.boolean }}>{String(data)}</span>
    </div>
  )

  if (Array.isArray(data)) {
    const len = data.length
    return (
      <div style={{ paddingLeft: indent }}>
        <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, userSelect: 'none' }}>
          <span style={{ color: rgba(T.fg, 0.3), fontSize: 10, marginRight: 4 }}>{open ? '\u25BC' : '\u25B6'}</span>
          {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
          {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
          <span style={{ color: COLORS.bracket }}>[</span>
          {!open && <span style={{ color: 'var(--win-text-muted)', fontSize: 11 }}> {len}개 항목 </span>}
          {!open && <span style={{ color: COLORS.bracket }}>]</span>}
        </span>
        {open && data.map((item, i) => <JsonNode key={i} data={item} depth={depth + 1} defaultOpen={depth < 1} />)}
        {open && <div style={{ paddingLeft: 0, fontSize: 13, fontFamily: 'monospace', color: COLORS.bracket }}>]</div>}
      </div>
    )
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>)
    return (
      <div style={{ paddingLeft: indent }}>
        <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, userSelect: 'none' }}>
          <span style={{ color: rgba(T.fg, 0.3), fontSize: 10, marginRight: 4 }}>{open ? '\u25BC' : '\u25B6'}</span>
          {name !== undefined && <span style={{ color: COLORS.key }}>"{name}"</span>}
          {name !== undefined && <span style={{ color: rgba(T.fg, 0.3) }}>: </span>}
          <span style={{ color: COLORS.bracket }}>{'{'}</span>
          {!open && <span style={{ color: 'var(--win-text-muted)', fontSize: 11 }}> {keys.length}개 키 </span>}
          {!open && <span style={{ color: COLORS.bracket }}>{'}'}</span>}
        </span>
        {open && keys.map(k => <JsonNode key={k} data={(data as Record<string, unknown>)[k]} name={k} depth={depth + 1} defaultOpen={depth < 1} />)}
        {open && <div style={{ paddingLeft: 0, fontSize: 13, fontFamily: 'monospace', color: COLORS.bracket }}>{'}'}</div>}
      </div>
    )
  }

  return <div style={{ paddingLeft: indent, fontSize: 13, color: 'var(--win-text-muted)' }}>{String(data)}</div>
}

export default function JsonViewerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('{\n  "name": "홍길동",\n  "age": 20,\n  "scores": [95, 88, 92],\n  "active": true\n}')
  const [tab, setTab] = useState<'input' | 'tree'>('input')
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)

  const parseJson = useCallback(() => {
    try {
      const data = JSON.parse(input)
      setParsed(data)
      setError(null)
      setTab('tree')
    } catch (e) { setError((e as Error).message); setParsed(null) }
  }, [input])

  const format = useCallback(() => {
    try { setInput(JSON.stringify(JSON.parse(input), null, 2)); setError(null) } catch (e) { setError((e as Error).message) }
  }, [input])

  const minify = useCallback(() => {
    try { setInput(JSON.stringify(JSON.parse(input))); setError(null) } catch (e) { setError((e as Error).message) }
  }, [input])

  const copy = () => {
    navigator.clipboard.writeText(input).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) }).catch(() => {})
  }

  return (
    <Modal title="JSON 뷰어" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {[{ id: 'input' as const, l: '입력' }, { id: 'tree' as const, l: '트리 뷰' }].map(t => (
            <button key={t.id} onClick={() => { if (t.id === 'tree') parseJson(); else setTab('input') }} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.l}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="win-btn-ghost" onClick={format} style={{ fontSize: 11 }}>포맷</button>
            <button className="win-btn-ghost" onClick={minify} style={{ fontSize: 11 }}>축소</button>
            <button className="win-btn-ghost" onClick={copy} style={{ fontSize: 11 }}>{copied ? '복사됨!' : '복사'}</button>
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: T.danger, padding: '6px 10px', background: rgba(T.danger, 0.1), borderRadius: 6 }}>{error}</div>}

        {tab === 'input' && (
          <textarea
            className="win-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='{"key": "value"}'
            style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
          />
        )}

        {tab === 'tree' && (
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
            {parsed !== null ? (
              <JsonNode data={parsed} depth={0} defaultOpen={true} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>JSON을 입력하고 파싱하세요</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
