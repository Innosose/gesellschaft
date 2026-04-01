import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface FileItem { original: string; preview: string }

type Rule = 'prefix' | 'suffix' | 'replace' | 'number' | 'lower' | 'upper' | 'ext'

export default function BatchModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [files, setFiles] = useState<FileItem[]>([])
  const [rule, setRule] = useState<Rule>('replace')
  const [find, setFind] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [startNum, setStartNum] = useState(1)
  const [newExt, setNewExt] = useState('')

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    const items: FileItem[] = Array.from(list).map(f => ({ original: f.name, preview: f.name }))
    setFiles(items)
  }, [])

  const applyRule = useCallback(() => {
    setFiles(prev => prev.map((f, i) => {
      const dot = f.original.lastIndexOf('.')
      const name = dot > 0 ? f.original.slice(0, dot) : f.original
      const ext = dot > 0 ? f.original.slice(dot) : ''
      let result = name
      switch (rule) {
        case 'prefix': result = prefix + name; break
        case 'suffix': result = name + suffix; break
        case 'replace': result = name.replaceAll(find, replaceWith); break
        case 'number': result = `${name}_${String(startNum + i).padStart(3, '0')}`; break
        case 'lower': result = name.toLowerCase(); break
        case 'upper': result = name.toUpperCase(); break
        case 'ext': return { ...f, preview: name + (newExt.startsWith('.') ? newExt : '.' + newExt) }
      }
      return { ...f, preview: result + ext }
    }))
  }, [rule, find, replaceWith, prefix, suffix, startNum, newExt])

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  const rules: { id: Rule; label: string }[] = [
    { id: 'replace', label: '찾기/바꾸기' },
    { id: 'prefix', label: '접두어' },
    { id: 'suffix', label: '접미어' },
    { id: 'number', label: '번호 붙이기' },
    { id: 'lower', label: '소문자' },
    { id: 'upper', label: '대문자' },
    { id: 'ext', label: '확장자 변경' },
  ]

  return (
    <Modal title="Batch" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        <input type="file" multiple onChange={handleFiles} style={{ fontSize: 11, color: rgba(T.fg, 0.6) }} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {rules.map(r => (
            <button key={r.id} onClick={() => setRule(r.id)} style={{
              padding: '4px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${rule === r.id ? rgba(T.teal, 0.3) : rgba(T.gold, 0.1)}`,
              background: rule === r.id ? rgba(T.teal, 0.08) : 'transparent',
              color: rule === r.id ? T.teal : rgba(T.fg, 0.5),
            }}>{r.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rule === 'replace' && <>
            <input value={find} onChange={e => setFind(e.target.value)} placeholder="찾을 텍스트" style={{ ...inputStyle, flex: 1 }} />
            <span style={{ color: rgba(T.gold, 0.4), fontSize: 11 }}>→</span>
            <input value={replaceWith} onChange={e => setReplaceWith(e.target.value)} placeholder="바꿀 텍스트" style={{ ...inputStyle, flex: 1 }} />
          </>}
          {rule === 'prefix' && <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="앞에 붙일 텍스트" style={{ ...inputStyle, flex: 1 }} />}
          {rule === 'suffix' && <input value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="뒤에 붙일 텍스트" style={{ ...inputStyle, flex: 1 }} />}
          {rule === 'number' && <input type="number" value={startNum} onChange={e => setStartNum(Number(e.target.value))} placeholder="시작 번호" style={{ ...inputStyle, width: 80 }} />}
          {rule === 'ext' && <input value={newExt} onChange={e => setNewExt(e.target.value)} placeholder="새 확장자 (예: .png)" style={{ ...inputStyle, width: 120 }} />}
          {(rule === 'lower' || rule === 'upper') && <span style={{ fontSize: 11, color: rgba(T.fg, 0.4) }}>추가 설정 없음</span>}
          <button onClick={applyRule} disabled={files.length === 0} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`, background: rgba(T.teal, 0.08), color: T.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>적용</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {files.map((f, i) => {
            const changed = f.original !== f.preview
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 3, background: rgba(T.gold, 0.02), border: `1px solid ${rgba(T.gold, 0.04)}` }}>
                <span style={{ flex: 1, fontSize: 11, color: rgba(T.fg, 0.5), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original}</span>
                <span style={{ color: rgba(T.gold, 0.3), fontSize: 10 }}>→</span>
                <span style={{ flex: 1, fontSize: 11, color: changed ? T.teal : rgba(T.fg, 0.5), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: changed ? 600 : 400 }}>{f.preview}</span>
              </div>
            )
          })}
          {files.length === 0 && <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 40 }}>파일을 선택하면 이름 변경 미리보기가 표시됩니다</div>}
        </div>
      </div>
    </Modal>
  )
}
