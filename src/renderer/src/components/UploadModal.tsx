import React, { useState, useCallback, useRef } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface FileInfo {
  name: string; size: number; type: string; lastModified: number
  width?: number; height?: number; duration?: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src) }
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = URL.createObjectURL(file)
  })
}

const LIMITS = [
  { label: '이메일 첨부', max: 25 * 1024 * 1024 },
  { label: '카카오톡', max: 300 * 1024 * 1024 },
  { label: 'Discord', max: 25 * 1024 * 1024 },
  { label: 'GitHub', max: 100 * 1024 * 1024 },
  { label: 'Slack', max: 1024 * 1024 * 1024 },
]

export default function UploadModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [copied, setCopied] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    const infos: FileInfo[] = []
    for (const file of Array.from(list)) {
      const info: FileInfo = { name: file.name, size: file.size, type: file.type || 'unknown', lastModified: file.lastModified }
      if (file.type.startsWith('image/')) {
        const dim = await getImageDimensions(file)
        info.width = dim.width; info.height = dim.height
      }
      infos.push(info)
    }
    setFiles(infos)
  }, [])

  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key); setTimeout(() => setCopied(''), 1000)
    } catch { /* clipboard unavailable */ }
  }, [])

  const totalSize = files.reduce((s, f) => s + f.size, 0)

  return (
    <Modal title="Upload" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
        <input ref={fileRef} type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{
          padding: '16px 20px', borderRadius: 6, border: `2px dashed ${rgba(T.gold, 0.2)}`,
          background: rgba(T.gold, 0.03), color: rgba(T.fg, 0.6),
          cursor: 'pointer', fontSize: 12, textAlign: 'center',
        }}>
          파일을 선택하거나 여기에 드래그하세요
        </button>

        {files.length > 0 && (
          <>
            {files.length > 1 && (
              <div style={{ fontSize: 11, color: rgba(T.gold, 0.6), display: 'flex', gap: 12 }}>
                <span>총 {files.length}개</span>
                <span>합계: {formatSize(totalSize)}</span>
              </div>
            )}

            {files.map((f, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 6, background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.06)}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: rgba(T.fg, 0.85), marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {[
                    { label: '크기', value: formatSize(f.size) },
                    { label: '형식', value: f.type },
                    ...(f.width ? [{ label: '해상도', value: `${f.width} x ${f.height}px` }] : []),
                    { label: '수정일', value: new Date(f.lastModified).toLocaleString('ko-KR') },
                    { label: '확장자', value: f.name.includes('.') ? f.name.split('.').pop()!.toUpperCase() : 'N/A' },
                  ].map(item => (
                    <div key={item.label} onClick={() => handleCopy(item.value, `${i}-${item.label}`)} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 9, color: rgba(T.gold, 0.5), marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: copied === `${i}-${item.label}` ? T.teal : rgba(T.fg, 0.75), fontFamily: 'monospace' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Upload limit check */}
            <div style={{ borderTop: `1px solid ${rgba(T.gold, 0.06)}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: rgba(T.gold, 0.5), letterSpacing: '0.1em', marginBottom: 8 }}>업로드 가능 여부</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LIMITS.map(l => {
                  const ok = totalSize <= l.max
                  return (
                    <div key={l.label} style={{
                      padding: '5px 10px', borderRadius: 4, fontSize: 10,
                      background: ok ? rgba(T.teal, 0.06) : rgba(T.danger, 0.06),
                      border: `1px solid ${ok ? rgba(T.teal, 0.15) : rgba(T.danger, 0.12)}`,
                      color: ok ? rgba(T.teal, 0.8) : rgba(T.danger, 0.7),
                    }}>
                      {l.label} ({formatSize(l.max)}) — {ok ? '가능' : '초과'}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {files.length === 0 && (
          <div style={{ textAlign: 'center', color: rgba(T.fg, 0.25), fontSize: 12, padding: 30 }}>
            파일의 크기, 형식, 해상도를 확인하고<br/>업로드 가능 여부를 판단합니다
          </div>
        )}
      </div>
    </Modal>
  )
}
