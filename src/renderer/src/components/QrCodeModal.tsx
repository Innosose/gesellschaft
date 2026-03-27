import React from 'react'
import { Modal } from './SearchModal'
import QRCode from 'qrcode'

interface QrCodeModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function QrCodeModal({ onClose, asPanel }: QrCodeModalProps): React.ReactElement {
  const [text, setText] = React.useState('')
  const [size, setSize] = React.useState(256)
  const [errorLevel, setErrorLevel] = React.useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [darkColor, setDarkColor] = React.useState('#000000')
  const [lightColor, setLightColor] = React.useState('#ffffff')
  const [error, setError] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (!text || !canvasRef.current) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      return
    }
    setError('')
    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      errorCorrectionLevel: errorLevel,
      color: { dark: darkColor, light: lightColor },
      margin: 2,
    }).catch((e: Error) => {
      setError(e?.message || 'QR 코드 생성 실패')
    })
  }, [text, size, errorLevel, darkColor, lightColor])

  const handleDownload = (): void => {
    if (!canvasRef.current || !text) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qrcode_${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const handleCopy = async (): Promise<void> => {
    if (!canvasRef.current || !text) return
    canvasRef.current.toBlob(async blob => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        // fallback: copy as text
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    }, 'image/png')
  }

  return (
    <Modal title="QR코드 생성기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 20, height: '100%' }}>
        {/* 설정 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 240, flexShrink: 0 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>내용 (텍스트/URL)</label>
            <textarea
              className="win-textarea"
              style={{ width: '100%', minHeight: 100, resize: 'vertical', fontSize: 13 }}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="QR코드로 만들 텍스트나 URL을 입력하세요..."
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>크기</label>
            <select
              className="win-select"
              style={{ width: '100%' }}
              value={size}
              onChange={e => setSize(Number(e.target.value))}
            >
              <option value={128}>128 × 128 px</option>
              <option value={256}>256 × 256 px</option>
              <option value={512}>512 × 512 px</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>오류 수정 수준</label>
            <select
              className="win-select"
              style={{ width: '100%' }}
              value={errorLevel}
              onChange={e => setErrorLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
            >
              <option value="L">L — 낮음 (7%)</option>
              <option value="M">M — 중간 (15%)</option>
              <option value="Q">Q — 높음 (25%)</option>
              <option value="H">H — 최고 (30%)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>전경색 (Dark)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={darkColor}
                  onChange={e => setDarkColor(e.target.value)}
                  style={{ width: 36, height: 30, padding: 2, border: '1px solid var(--win-border)', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  className="win-input"
                  value={darkColor}
                  onChange={e => setDarkColor(e.target.value)}
                  style={{ flex: 1, fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', display: 'block', marginBottom: 6 }}>배경색 (Light)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={lightColor}
                  onChange={e => setLightColor(e.target.value)}
                  style={{ width: 36, height: 30, padding: 2, border: '1px solid var(--win-border)', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  className="win-input"
                  value={lightColor}
                  onChange={e => setLightColor(e.target.value)}
                  style={{ flex: 1, fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="win-btn-primary"
              disabled={!text}
              onClick={handleDownload}
              style={{ flex: 1, fontSize: 13 }}
            >
              PNG 저장
            </button>
            <button
              className="win-btn-secondary"
              disabled={!text}
              onClick={handleCopy}
              style={{ flex: 1, fontSize: 13 }}
            >
              {copied ? '✅ 복사됨' : '클립보드 복사'}
            </button>
          </div>
        </div>

        {/* 미리보기 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--win-surface-2)',
            borderRadius: 12,
            border: '1px solid var(--win-border)',
            overflow: 'hidden',
          }}
        >
          {text ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <canvas
                ref={canvasRef}
                width={size}
                height={size}
                style={{
                  borderRadius: 8,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
                {size} × {size} px · 오류 수정 {errorLevel}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--win-text-muted)', fontSize: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔳</div>
              <div>텍스트나 URL을 입력하면<br />QR코드가 생성됩니다</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
