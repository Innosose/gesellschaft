import React, { useState, useMemo, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type Format = 'json' | 'yaml'

function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'string') return obj.includes('\n') ? `|\n${obj.split('\n').map(l => pad + '  ' + l).join('\n')}` : JSON.stringify(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map(item => `${pad}- ${jsonToYaml(item, indent + 1).trimStart()}`).join('\n')
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries.map(([k, v]) => {
      const val = jsonToYaml(v, indent + 1)
      if (typeof v === 'object' && v !== null && (Array.isArray(v) ? v.length > 0 : Object.keys(v as object).length > 0)) {
        return `${pad}${k}:\n${val}`
      }
      return `${pad}${k}: ${val}`
    }).join('\n')
  }
  return String(obj)
}

function simpleYamlParse(yaml: string): unknown {
  // Basic YAML-like parser for simple structures
  try { return JSON.parse(yaml) } catch { /* not JSON */ }
  const lines = yaml.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
  const result: Record<string, unknown> = {}
  for (const line of lines) {
    const match = line.match(/^(\s*)(\w[\w\s]*?):\s*(.*)$/)
    if (match) {
      const [, , key, val] = match
      if (val === '' || val === '~' || val === 'null') result[key] = null
      else if (val === 'true') result[key] = true
      else if (val === 'false') result[key] = false
      else if (/^-?\d+(\.\d+)?$/.test(val)) result[key] = Number(val)
      else result[key] = val.replace(/^["']|["']$/g, '')
    }
  }
  return result
}

export default function YamlViewerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('{\n  "name": "gesellschaft",\n  "version": "1.0.0",\n  "features": ["overlay", "tools"]\n}')
  const [sourceFormat, setSourceFormat] = useState<Format>('json')
  const [copied, setCopied] = useState(false)

  const converted = useMemo(() => {
    try {
      if (sourceFormat === 'json') {
        const parsed = JSON.parse(input)
        return { ok: true as const, text: jsonToYaml(parsed) }
      } else {
        const parsed = simpleYamlParse(input)
        return { ok: true as const, text: JSON.stringify(parsed, null, 2) }
      }
    } catch (e) {
      return { ok: false as const, text: `변환 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
    }
  }, [input, sourceFormat])

  const validate = useMemo(() => {
    try {
      if (sourceFormat === 'json') { JSON.parse(input); return { valid: true, msg: 'Valid JSON' } }
      else { simpleYamlParse(input); return { valid: true, msg: 'Valid YAML (basic)' } }
    } catch (e) { return { valid: false, msg: e instanceof Error ? e.message : 'Invalid' } }
  }, [input, sourceFormat])

  const handleCopy = useCallback(() => {
    if (converted.ok) { navigator.clipboard.writeText(converted.text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }, [converted])

  const handleFormat = useCallback(() => {
    if (sourceFormat === 'json') {
      try { setInput(JSON.stringify(JSON.parse(input), null, 2)) } catch { /* ignore */ }
    }
  }, [input, sourceFormat])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="YAML Viewer" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={sourceFormat} onChange={e => setSourceFormat(e.target.value as Format)} style={{ ...inputStyle, width: 90 }}>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <span style={{ fontSize: 11, color: rgba(T.gold, 0.5) }}>→</span>
          <span style={{ fontSize: 12, color: rgba(T.fg, 0.6) }}>{sourceFormat === 'json' ? 'YAML' : 'JSON'}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: validate.valid ? rgba(T.teal, 0.7) : rgba(T.danger, 0.7) }}>{validate.msg}</span>
          {sourceFormat === 'json' && <button onClick={handleFormat} style={{ ...inputStyle, cursor: 'pointer', fontSize: 10 }}>Format</button>}
          <button onClick={handleCopy} style={{ ...inputStyle, cursor: 'pointer', fontSize: 10, color: copied ? T.teal : undefined }}>{copied ? '복사됨' : '복사'}</button>
        </div>
        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={`${sourceFormat.toUpperCase()} 입력...`}
            spellCheck={false} style={{ ...inputStyle, flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }} />
          <pre style={{ flex: 1, ...inputStyle, overflow: 'auto', margin: 0, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
            color: converted.ok ? rgba(T.fg, 0.85) : rgba(T.danger, 0.7), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {converted.text}
          </pre>
        </div>
      </div>
    </Modal>
  )
}
