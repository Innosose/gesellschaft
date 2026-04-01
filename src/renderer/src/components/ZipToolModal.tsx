import React, { useState, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface ZipEntry { name: string; size: number; compressed: number; isDir: boolean }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Simple ZIP reader using DataView (local file headers)
async function readZipEntries(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const view = new DataView(buffer)
  const entries: ZipEntry[] = []
  let offset = 0

  while (offset < buffer.byteLength - 4) {
    const sig = view.getUint32(offset, true)
    if (sig !== 0x04034b50) break // PK\x03\x04
    const compressed = view.getUint32(offset + 18, true)
    const uncompressed = view.getUint32(offset + 22, true)
    const nameLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)
    const nameBytes = new Uint8Array(buffer, offset + 30, nameLen)
    const name = new TextDecoder().decode(nameBytes)
    entries.push({ name, size: uncompressed, compressed, isDir: name.endsWith('/') })
    offset += 30 + nameLen + extraLen + compressed
  }
  return entries
}

export default function ZipToolModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [entries, setEntries] = useState<ZipEntry[]>([])
  const [fileName, setFileName] = useState('')
  const [totalSize, setTotalSize] = useState(0)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setFileName(file.name)
    setTotalSize(file.size)
    try {
      const buffer = await file.arrayBuffer()
      const result = await readZipEntries(buffer)
      if (result.length === 0) { setError('ZIP 파일을 읽을 수 없거나 비어 있습니다.'); return }
      setEntries(result)
    } catch {
      setError('ZIP 파일 분석 중 오류가 발생했습니다.')
    }
  }, [])

  const filtered = filter
    ? entries.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()))
    : entries

  const dirs = filtered.filter(e => e.isDir)
  const files = filtered.filter(e => !e.isDir)
  const totalUncompressed = entries.reduce((s, e) => s + e.size, 0)
  const ratio = totalUncompressed > 0 ? ((1 - totalSize / totalUncompressed) * 100).toFixed(1) : '0'

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 12, outline: 'none',
  }

  return (
    <Modal title="Zip Tool" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
        <input ref={fileRef} type="file" accept=".zip" onChange={handleFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{
          padding: '14px 20px', borderRadius: 6, border: `2px dashed ${rgba(T.gold, 0.2)}`,
          background: rgba(T.gold, 0.03), color: rgba(T.fg, 0.6),
          cursor: 'pointer', fontSize: 12, textAlign: 'center',
        }}>
          {fileName || 'ZIP 파일을 선택하세요'}
        </button>

        {error && <div style={{ fontSize: 11, color: rgba(T.danger, 0.8), padding: '6px 10px', background: rgba(T.danger, 0.06), borderRadius: 4 }}>{error}</div>}

        {entries.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: rgba(T.fg, 0.5) }}>
              <span>파일: {files.length}</span>
              <span>폴더: {dirs.length}</span>
              <span>원본: {formatSize(totalUncompressed)}</span>
              <span>압축: {formatSize(totalSize)}</span>
              <span>압축률: {ratio}%</span>
            </div>

            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="파일명 검색..." style={{ ...inputStyle, width: '100%' }} />

            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 3,
                  background: entry.isDir ? rgba(T.gold, 0.04) : rgba(T.gold, 0.02),
                  border: `1px solid ${rgba(T.gold, 0.04)}`,
                }}>
                  <span style={{ fontSize: 11, color: entry.isDir ? rgba(T.gold, 0.6) : rgba(T.teal, 0.5), fontFamily: 'monospace', width: 14 }}>
                    {entry.isDir ? '/' : '.'}
                  </span>
                  <span style={{ flex: 1, fontSize: 11, color: rgba(T.fg, 0.75), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.name}
                  </span>
                  {!entry.isDir && (
                    <span style={{ fontSize: 10, color: rgba(T.fg, 0.35), whiteSpace: 'nowrap' }}>
                      {formatSize(entry.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {entries.length === 0 && !error && !fileName && (
          <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 40 }}>
            ZIP 파일의 내용을 분석하고 목록을 확인합니다
          </div>
        )}
      </div>
    </Modal>
  )
}
