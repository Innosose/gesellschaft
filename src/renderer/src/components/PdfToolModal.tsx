import React from 'react'
import { Modal } from './SearchModal'

interface PdfToolModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function PdfToolModal({ onClose, asPanel }: PdfToolModalProps): React.ReactElement {
  const [mode, setMode] = React.useState<'merge' | 'split'>('merge')
  const [mergeFiles, setMergeFiles] = React.useState<string[]>([])
  const [mergeOutput, setMergeOutput] = React.useState('')
  const [splitFile, setSplitFile] = React.useState('')
  const [splitOutputDir, setSplitOutputDir] = React.useState('')
  const [splitResults, setSplitResults] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [resultPath, setResultPath] = React.useState('')
  const [dropOver, setDropOver] = React.useState(false)
  const dragIdx = React.useRef<number | null>(null)
  const dragOverIdx = React.useRef<number | null>(null)

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDropOver(false)
    const dropped = Array.from(e.dataTransfer.files)
      .filter(f => f.name.toLowerCase().endsWith('.pdf'))
      .map(f => (f as File & { path?: string }).path ?? f.name)
      .filter(p => p && !mergeFiles.includes(p))
    if (dropped.length > 0) setMergeFiles(prev => [...prev, ...dropped])
  }

  const handleDragStart = (idx: number): void => { dragIdx.current = idx }
  const handleDragOver = (e: React.DragEvent, idx: number): void => { e.preventDefault(); dragOverIdx.current = idx }
  const handleDrop = (): void => {
    const from = dragIdx.current
    const to = dragOverIdx.current
    if (from === null || to === null || from === to) return
    setMergeFiles(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
    dragIdx.current = null
    dragOverIdx.current = null
  }

  React.useEffect(() => {
    window.api.pdfTool.defaultOutputDir().then(dir => {
      if (dir) {
        setMergeOutput(dir)
        setSplitOutputDir(dir)
      }
    }).catch(() => {})
  }, [])

  const handleAddFiles = async (): Promise<void> => {
    const files = await window.api.pdfTool.openFiles()
    if (files && files.length > 0) {
      setMergeFiles(prev => [...prev, ...files.filter(f => !prev.includes(f))])
    }
  }

  const handleRemoveFile = (idx: number): void => {
    setMergeFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleMoveFile = (idx: number, dir: -1 | 1): void => {
    setMergeFiles(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const handleBrowseOutput = async (): Promise<void> => {
    const dir = await window.api.pdfTool.openOutputDir()
    if (dir) setMergeOutput(dir)
  }

  const handleMerge = async (): Promise<void> => {
    if (mergeFiles.length < 2) {
      setErrorMsg('PDF 파일을 2개 이상 추가해주세요.')
      setStatus('error')
      return
    }
    if (!mergeOutput) {
      setErrorMsg('출력 경로를 지정해주세요.')
      setStatus('error')
      return
    }
    setStatus('processing')
    setErrorMsg('')
    try {
      const result = await window.api.pdfTool.merge(mergeFiles, mergeOutput)
      if (!result.success) throw new Error(result.error ?? '병합 실패')
      setResultPath(result.outputPath ?? mergeOutput)
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '병합 중 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  const handlePickSplitFile = async (): Promise<void> => {
    const files = await window.api.pdfTool.openFiles()
    if (files && files.length > 0) setSplitFile(files[0])
  }

  const handleBrowseSplitOutput = async (): Promise<void> => {
    const dir = await window.api.pdfTool.openOutputDir()
    if (dir) setSplitOutputDir(dir)
  }

  const handleSplit = async (): Promise<void> => {
    if (!splitFile) {
      setErrorMsg('PDF 파일을 선택해주세요.')
      setStatus('error')
      return
    }
    if (!splitOutputDir) {
      setErrorMsg('출력 폴더를 지정해주세요.')
      setStatus('error')
      return
    }
    setStatus('processing')
    setErrorMsg('')
    setSplitResults([])
    try {
      const result = await window.api.pdfTool.split(splitFile, splitOutputDir)
      if (!result.success) throw new Error(result.error ?? '분할 실패')
      setSplitResults(result.files ?? [])
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '분할 중 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  const fileName = (p: string): string => p.split(/[\\/]/).pop() || p

  return (
    <Modal title="PDF 병합 / 분할" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* 모드 탭 */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--win-border)' }}>
          {(['merge', 'split'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setStatus('idle'); setErrorMsg('') }}
              style={{
                padding: '8px 24px',
                background: mode === m ? 'var(--win-accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--win-text-sub)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: mode === m ? 600 : 400,
                borderRadius: '6px 6px 0 0',
                fontSize: 13,
              }}
            >
              {m === 'merge' ? '병합' : '분할'}
            </button>
          ))}
        </div>

        {mode === 'merge' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="win-btn-primary" onClick={handleAddFiles}>
                + PDF 파일 추가
              </button>
              <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>
                {mergeFiles.length > 0 ? `${mergeFiles.length}개 파일 선택됨` : '파일을 추가해주세요'}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                border: `1px solid ${dropOver ? 'var(--win-accent)' : 'var(--win-border)'}`,
                borderRadius: 6,
                background: dropOver ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                minHeight: 80,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); setDropOver(true) }}
              onDragLeave={() => setDropOver(false)}
              onDrop={handleFileDrop}
            >
              {mergeFiles.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 80, color: 'var(--win-text-muted)', fontSize: 13, gap: 4 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <span>PDF 파일을 드래그하거나 추가하세요</span>
                </div>
              )}
            {mergeFiles.length > 0 && (
              <>
                {mergeFiles.map((f, idx) => (
                  <div
                    key={f}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => { e.stopPropagation(); handleDragOver(e, idx) }}
                    onDrop={e => { e.stopPropagation(); handleDrop() }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderBottom: idx < mergeFiles.length - 1 ? '1px solid var(--win-border)' : 'none',
                      cursor: 'grab',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--win-text-muted)', userSelect: 'none' }}>⠿</span>
                    <span style={{ fontSize: 16 }}>📄</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--win-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName(f)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>PDF</span>
                    <button
                      className="win-btn-ghost"
                      style={{ padding: '2px 6px', fontSize: 12 }}
                      onClick={() => handleMoveFile(idx, -1)}
                      disabled={idx === 0}
                    >↑</button>
                    <button
                      className="win-btn-ghost"
                      style={{ padding: '2px 6px', fontSize: 12 }}
                      onClick={() => handleMoveFile(idx, 1)}
                      disabled={idx === mergeFiles.length - 1}
                    >↓</button>
                    <button
                      className="win-btn-danger"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => handleRemoveFile(idx)}
                    >삭제</button>
                  </div>
                ))}
              </>
            )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>출력 경로</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="win-input"
                  style={{ flex: 1 }}
                  value={mergeOutput}
                  onChange={e => setMergeOutput(e.target.value)}
                  placeholder="출력 폴더 경로..."
                />
                <button className="win-btn-secondary" onClick={handleBrowseOutput}>찾기</button>
              </div>
            </div>

            {status === 'processing' && (
              <div style={{ padding: '6px 0' }}>
                <div style={{ height: 4, background: 'var(--win-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '40%', background: 'var(--win-accent)', borderRadius: 2, animation: 'pdfProgress 1.2s ease-in-out infinite alternate' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 4 }}>PDF 병합 중...</div>
              </div>
            )}
            {status === 'error' && (
              <div style={{ padding: '10px 14px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
                ⚠️ {errorMsg}
              </div>
            )}
            {status === 'done' && (
              <div style={{ padding: '10px 14px', background: 'var(--win-success)', color: '#fff', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>✅ 병합 완료: {fileName(resultPath)}</span>
                <button
                  className="win-btn-secondary"
                  style={{ marginLeft: 'auto', fontSize: 12 }}
                  onClick={() => (window.api as any).pdfTool?.openPath?.(resultPath)}
                >열기</button>
              </div>
            )}

            <button
              className="win-btn-primary"
              disabled={status === 'processing'}
              onClick={handleMerge}
              style={{ alignSelf: 'flex-start' }}
            >
              {status === 'processing' ? '⏳ 병합 중...' : '병합 시작'}
            </button>
          </div>
        )}

        {mode === 'split' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>분할할 PDF 파일</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="win-input"
                  style={{ flex: 1 }}
                  value={splitFile}
                  onChange={e => setSplitFile(e.target.value)}
                  placeholder="PDF 파일 경로..."
                  readOnly
                />
                <button className="win-btn-secondary" onClick={handlePickSplitFile}>파일 선택</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>출력 폴더</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="win-input"
                  style={{ flex: 1 }}
                  value={splitOutputDir}
                  onChange={e => setSplitOutputDir(e.target.value)}
                  placeholder="출력 폴더 경로..."
                />
                <button className="win-btn-secondary" onClick={handleBrowseSplitOutput}>찾기</button>
              </div>
            </div>

            {status === 'error' && (
              <div style={{ padding: '10px 14px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {status === 'done' && splitResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '10px 14px', background: 'var(--win-success)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
                  ✅ 분할 완료: {splitResults.length}개 파일 생성됨
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 200, border: '1px solid var(--win-border)', borderRadius: 6, background: 'var(--win-surface-2)' }}>
                  {splitResults.map((f, idx) => (
                    <div
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 12px',
                        borderBottom: idx < splitResults.length - 1 ? '1px solid var(--win-border)' : 'none',
                        fontSize: 13,
                      }}
                    >
                      <span>📄</span>
                      <span style={{ flex: 1, color: 'var(--win-text)' }}>{fileName(f)}</span>
                      <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>페이지 {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="win-btn-primary"
              disabled={status === 'processing'}
              onClick={handleSplit}
              style={{ alignSelf: 'flex-start' }}
            >
              {status === 'processing' ? '⏳ 분할 중...' : '분할 시작'}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes pdfProgress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
    </Modal>
  )
}
