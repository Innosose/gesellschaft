import React from 'react'
import { Modal } from './SearchModal'

interface ImageFile {
  path: string
  name: string
  status: 'waiting' | 'done' | 'error'
  errorMsg?: string
}

interface ImageConvertModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function ImageConvertModal({ onClose, asPanel }: ImageConvertModalProps): React.ReactElement {
  const [files, setFiles] = React.useState<ImageFile[]>([])
  const [format, setFormat] = React.useState<'jpg' | 'png' | 'bmp'>('jpg')
  const [quality, setQuality] = React.useState(85)
  const [resize, setResize] = React.useState(false)
  const [width, setWidth] = React.useState('')
  const [height, setHeight] = React.useState('')
  const [keepRatio, setKeepRatio] = React.useState(true)
  const [outputDir, setOutputDir] = React.useState('')
  const [converting, setConverting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
      .filter(f => /\.(jpe?g|png|bmp|webp|gif|tiff?)$/i.test(f.name))
      .map(f => ({ path: (f as File & { path?: string }).path ?? f.name, name: f.name, status: 'waiting' as const }))
      .filter(f => f.path && !files.some(ex => ex.path === f.path))
    if (dropped.length > 0) { setFiles(prev => [...prev, ...dropped]); setDone(false) }
  }

  React.useEffect(() => {
    window.api.imageTool.defaultOutputDir().then(dir => {
      if (dir) setOutputDir(dir)
    }).catch(() => {})
  }, [])

  const handleAddFiles = async (): Promise<void> => {
    const picked = await window.api.imageTool.openFiles()
    if (!picked || picked.length === 0) return
    const newFiles: ImageFile[] = picked
      .filter(p => !files.some(f => f.path === p))
      .map(p => ({ path: p, name: p.split(/[\\/]/).pop() || p, status: 'waiting' }))
    setFiles(prev => [...prev, ...newFiles])
    setDone(false)
  }

  const handleRemoveFile = (idx: number): void => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleBrowseOutput = async (): Promise<void> => {
    const dir = await window.api.imageTool.openOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleConvert = async (): Promise<void> => {
    if (files.length === 0) return
    setConverting(true)
    setDone(false)

    const jobs = files.map(f => ({
      filePath: f.path,
      outputDir,
      format,
      quality,
      width: resize && width ? parseInt(width) : 0,
      height: resize && height ? parseInt(height) : 0,
      keepAspect: keepRatio,
    }))

    try {
      const results = await window.api.imageTool.convert(jobs)
      setFiles(prev => prev.map((f, i) => ({
        ...f,
        status: results[i]?.success ? 'done' : 'error',
        errorMsg: results[i]?.error,
      })))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '변환 오류'
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', errorMsg: msg })))
    }

    setConverting(false)
    setDone(true)
  }

  const statusColor = (s: ImageFile['status']): string => {
    if (s === 'done') return 'var(--win-success)'
    if (s === 'error') return 'var(--win-danger)'
    return 'var(--win-text-muted)'
  }

  const statusLabel = (s: ImageFile['status']): string => {
    if (s === 'done') return '완료'
    if (s === 'error') return '오류'
    return '대기'
  }

  return (
    <Modal title="이미지 일괄 변환 / 리사이즈" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', gap: 16, height: '100%' }}>
        {/* 파일 목록 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="win-btn-primary" onClick={handleAddFiles}>+ 이미지 추가</button>
            {files.length > 0 && (
              <button className="win-btn-ghost" style={{ fontSize: 12 }} onClick={() => setFiles([])}>
                전체 초기화
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--win-text-muted)', marginLeft: 'auto' }}>
              {files.length}개 파일
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: `1px solid ${dragOver ? 'var(--win-accent)' : 'var(--win-border)'}`,
              borderRadius: 6,
              background: dragOver ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
              minHeight: 100,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropFiles}
          >
            {files.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--win-text-muted)', fontSize: 13, gap: 4 }}>
                <span style={{ fontSize: 28 }}>🖼️</span>
                <span>이미지 파일을 드래그하거나 추가하세요</span>
              </div>
            ) : (
              files.map((f, idx) => (
                <div
                  key={f.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderBottom: idx < files.length - 1 ? '1px solid var(--win-border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 15 }}>🖼️</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--win-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  {f.errorMsg && (
                    <span style={{ fontSize: 11, color: 'var(--win-danger)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.errorMsg}
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(f.status) }}>
                    {statusLabel(f.status)}
                  </span>
                  <button
                    className="win-btn-ghost"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    onClick={() => handleRemoveFile(idx)}
                  >×</button>
                </div>
              ))
            )}
          </div>

          {/* 출력 경로 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>출력 폴더</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="win-input"
                style={{ flex: 1 }}
                value={outputDir}
                onChange={e => setOutputDir(e.target.value)}
                placeholder="출력 폴더 경로..."
              />
              <button className="win-btn-secondary" onClick={handleBrowseOutput}>찾기</button>
            </div>
          </div>

          {done && (
            <div style={{ padding: '10px 14px', background: 'var(--win-success)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
              ✅ 변환 완료 — 완료: {files.filter(f => f.status === 'done').length}, 오류: {files.filter(f => f.status === 'error').length}
            </div>
          )}

          <button
            className="win-btn-primary"
            onClick={handleConvert}
            disabled={converting || files.length === 0}
            style={{ alignSelf: 'flex-start' }}
          >
            {converting ? '⏳ 변환 중...' : '변환 시작'}
          </button>
        </div>

        {/* 설정 패널 */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            background: 'var(--win-surface-2)',
            borderRadius: 8,
            border: '1px solid var(--win-border)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win-text-sub)', marginBottom: 8 }}>변환 설정</div>

            <label style={{ fontSize: 12, color: 'var(--win-text-sub)', display: 'block', marginBottom: 4 }}>출력 형식</label>
            <select
              className="win-select"
              style={{ width: '100%' }}
              value={format}
              onChange={e => setFormat(e.target.value as 'jpg' | 'png' | 'bmp')}
            >
              <option value="jpg">JPEG (.jpg)</option>
              <option value="png">PNG (.png)</option>
              <option value="bmp">BMP (.bmp)</option>
            </select>
          </div>

          {format === 'jpg' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--win-text-sub)', display: 'block', marginBottom: 4 }}>
                JPEG 품질: <strong>{quality}</strong>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--win-text-muted)' }}>
                <span>저품질</span>
                <span>고품질</span>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--win-text-sub)', cursor: 'pointer' }}>
              <input type="checkbox" checked={resize} onChange={e => setResize(e.target.checked)} />
              크기 조정
            </label>

            {resize && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>너비(px)</label>
                    <input
                      className="win-input"
                      type="number"
                      value={width}
                      onChange={e => setWidth(e.target.value)}
                      placeholder="자동"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>높이(px)</label>
                    <input
                      className="win-input"
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="자동"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--win-text-sub)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={keepRatio} onChange={e => setKeepRatio(e.target.checked)} />
                  비율 유지
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
