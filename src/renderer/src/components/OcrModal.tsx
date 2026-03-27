import React from 'react'
import { Modal } from './SearchModal'
import { createWorker } from 'tesseract.js'

interface OcrModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function OcrModal({ onClose, asPanel }: OcrModalProps): React.ReactElement {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null)
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [lang, setLang] = React.useState('kor+eng')
  const [progress, setProgress] = React.useState(0)
  const [running, setRunning] = React.useState(false)
  const [ocrStatus, setOcrStatus] = React.useState('')
  const [result, setResult] = React.useState('')
  const [error, setError] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File): void => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setResult('')
    setError('')
    setProgress(0)
    const url = URL.createObjectURL(file)
    setImageSrc(url)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleOcr = async (): Promise<void> => {
    if (!imageFile) return
    setRunning(true)
    setResult('')
    setError('')
    setProgress(0)
    try {
      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
          setOcrStatus(m.status)
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      const { data } = await worker.recognize(imageFile)
      setResult(data.text)
      setProgress(100)
      await worker.terminate()
    } catch (e: any) {
      setError(e?.message || 'OCR 처리 중 오류가 발생했습니다.')
    }
    setOcrStatus('')
    setRunning(false)
  }

  const handleCopy = async (): Promise<void> => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClear = (): void => {
    setImageSrc(null)
    setImageFile(null)
    setResult('')
    setError('')
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Modal title="이미지 OCR (텍스트 추출)" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 첫 실행 / 다운로드 안내 */}
        {running && ocrStatus && ocrStatus !== 'recognizing text' && (
          <div
            style={{
              padding: '8px 14px',
              background: 'var(--win-surface-2)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--win-text-muted)',
              border: '1px solid var(--win-border)',
            }}
          >
            ⬇️ 언어 데이터 준비 중 (첫 실행 시 10-30MB 다운로드): {ocrStatus}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          {/* 왼쪽: 이미지 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 드롭 영역 */}
            <div
              onClick={() => !imageSrc && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                flex: imageSrc ? 0 : 1,
                minHeight: imageSrc ? 0 : 120,
                border: `2px dashed ${isDragOver ? 'var(--win-accent)' : 'var(--win-border)'}`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: imageSrc ? 'default' : 'pointer',
                background: isDragOver ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                transition: 'all 0.15s',
              }}
            >
              {!imageSrc && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                  <div>이미지를 드래그하거나 클릭해서 선택</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG, BMP, GIF, WebP 지원</div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />

            {imageSrc && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="win-btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    다른 이미지 선택
                  </button>
                  <button className="win-btn-ghost" style={{ fontSize: 12 }} onClick={handleClear}>
                    초기화
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--win-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {imageFile?.name}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid var(--win-border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: 'var(--win-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 120,
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="미리보기"
                    style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }}
                  />
                </div>
              </>
            )}

            {/* 언어 및 실행 */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                className="win-select"
                value={lang}
                onChange={e => setLang(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="kor">한국어</option>
                <option value="eng">영어</option>
                <option value="kor+eng">한국어 + 영어</option>
              </select>
              <button
                className="win-btn-primary"
                onClick={handleOcr}
                disabled={!imageFile || running}
                style={{ flex: 1 }}
              >
                {running ? '⏳ 텍스트 추출 중...' : '텍스트 추출'}
              </button>
            </div>

            {/* 프로그레스 바 */}
            {running && (
              <div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--win-surface-3)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: ocrStatus === 'recognizing text' ? `${progress}%` : '100%',
                      background: 'var(--win-accent)',
                      borderRadius: 3,
                      transition: 'width 0.2s',
                      animation: ocrStatus !== 'recognizing text' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      opacity: ocrStatus !== 'recognizing text' ? 0.6 : 1,
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>
                  {ocrStatus === 'recognizing text' ? `${progress}% 완료` : '준비 중...'}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 결과 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>추출된 텍스트</label>
              {result && (
                <button
                  className="win-btn-ghost"
                  style={{ padding: '2px 10px', fontSize: 12 }}
                  onClick={handleCopy}
                >
                  {copied ? '✅ 복사됨' : '복사'}
                </button>
              )}
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            <textarea
              className="win-textarea"
              style={{
                flex: 1,
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: 13,
                minHeight: 200,
              }}
              value={result}
              onChange={e => setResult(e.target.value)}
              placeholder="텍스트 추출 결과가 여기에 표시됩니다..."
            />

            {result && (
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
                {result.length.toLocaleString('ko-KR')}자 · {result.split('\n').length}줄 추출됨
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
