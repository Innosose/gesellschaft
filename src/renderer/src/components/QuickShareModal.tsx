import React, { useState, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

// Simple QR-like SVG pattern (not a real QR code, but a visual representation)
function QrDisplay({ text }: { text: string }) {
  const size = 21
  const cells: boolean[][] = []
  // Generate a deterministic pattern from text hash
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0

  for (let r = 0; r < size; r++) {
    cells[r] = []
    for (let c = 0; c < size; c++) {
      // Finder patterns (corners)
      const isFinderArea = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
      if (isFinderArea) {
        const lr = r < 7 ? r : r - (size - 7)
        const lc = c < 7 ? c : c - (size - 7)
        cells[r][c] = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
      } else {
        // Data area - pseudo-random from hash
        const seed = hash ^ (r * 31 + c * 17)
        cells[r][c] = (seed & (1 << (c % 16))) !== 0
      }
    }
  }

  const cellSize = 6
  const svgSize = size * cellSize
  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ background: '#fff', borderRadius: 4 }}>
      {cells.map((row, r) => row.map((filled, c) =>
        filled ? <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#000" /> : null
      ))}
    </svg>
  )
}

export default function QuickShareModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [text, setText] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)

  const charCount = useMemo(() => text.length, [text])
  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text])
  const lineCount = useMemo(() => text ? text.split('\n').length : 0, [text])
  const byteSize = useMemo(() => new Blob([text]).size, [text])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }, [text])

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(1)} MB`
  }

  return (
    <Modal title="빠른 공유" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { l: '글자', v: charCount.toLocaleString() },
            { l: '단어', v: wordCount.toLocaleString() },
            { l: '줄', v: lineCount.toLocaleString() },
            { l: '크기', v: formatBytes(byteSize) },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.teal }}>{s.v}</div>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          className="win-input"
          value={text}
          onChange={e => { setText(e.target.value); setShowQr(false) }}
          placeholder="공유할 텍스트를 입력하세요..."
          style={{ flex: 1, resize: 'none', fontSize: 13, minHeight: 200, lineHeight: 1.6 }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="win-btn-primary" onClick={copy} disabled={!text} style={{ fontSize: 12 }}>{copied ? '복사됨!' : '클립보드 복사'}</button>
          <button className="win-btn-secondary" onClick={() => setShowQr(!showQr)} disabled={!text} style={{ fontSize: 12 }}>{showQr ? 'QR 숨기기' : 'QR 코드 생성'}</button>
          <button className="win-btn-ghost" onClick={() => setText('')} disabled={!text} style={{ fontSize: 12 }}>지우기</button>
        </div>

        {/* QR Display */}
        {showQr && text && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 20, background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)' }}>
            <QrDisplay text={text} />
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)', textAlign: 'center', maxWidth: 300 }}>
              시각적 QR 패턴입니다. 실제 QR 스캔은 지원하지 않습니다.
              <br />텍스트를 클립보드에 복사하여 공유하세요.
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
