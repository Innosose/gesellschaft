import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'
import { basename } from 'path-browserify'

interface FileItem {
  path: string
  status: 'waiting' | 'converting' | 'done' | 'error' | 'dwg_warning'
  outputPath?: string
  error?: string
}

export default function CadConvertModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [files, setFiles] = useState<FileItem[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    window.api.cadConvert.defaultOutputDir().then(setOutputDir)

    const unsub = window.api.cadConvert.onProgress((info) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.path === info.filePath
            ? { ...f, status: info.status, outputPath: info.outputPath, error: info.error }
            : f
        )
      )
    })
    return unsub
  }, [])

  const addFiles = async (): Promise<void> => {
    const paths = await window.api.cadConvert.openFiles()
    if (!paths.length) return
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path))
      const added = paths
        .filter((p) => !existing.has(p))
        .map((p) => ({
          path: p,
          status: (p.toLowerCase().endsWith('.dwg') ? 'dwg_warning' : 'waiting') as FileItem['status']
        }))
      return [...prev, ...added]
    })
  }

  const pickOutputDir = async (): Promise<void> => {
    const dir = await window.api.cadConvert.openOutputDir()
    if (dir) setOutputDir(dir)
  }

  const convert = async (): Promise<void> => {
    if (!files.length || converting) return
    setConverting(true)
    setFiles((prev) => prev.map((f) => ({ ...f, status: 'waiting', outputPath: undefined, error: undefined })))
    await window.api.cadConvert.convert(files.map((f) => f.path), outputDir)
    setConverting(false)
  }

  const removeFile = (path: string): void => {
    setFiles((prev) => prev.filter((f) => f.path !== path))
  }

  const STATUS_STYLE: Record<string, { label: string; pill: string }> = {
    waiting:     { label: '대기',        pill: 'win-pill win-pill-gray'   },
    converting:  { label: '변환 중',     pill: 'win-pill win-pill-blue'   },
    done:        { label: '완료',        pill: 'win-pill win-pill-green'  },
    error:       { label: '오류',        pill: 'win-pill win-pill-red'    },
    dwg_warning: { label: 'DXF 변환 필요', pill: 'win-pill win-pill-orange' },
  }

  const doneCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length

  return (
    <Modal title="CAD → PDF 변환 (DXF)" onClose={onClose} wide asPanel={asPanel}>
      <div className="flex flex-col gap-4">

        {/* 파일 추가 */}
        <div className="flex gap-2">
          <button className="win-btn-primary flex-1" onClick={addFiles}>
            + DXF 파일 추가
          </button>
          {files.length > 0 && !converting && (
            <button className="win-btn-ghost text-xs" onClick={() => setFiles([])}>
              전체 지우기
            </button>
          )}
        </div>

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--win-border)' }}
          >
            <div
              className="px-3 py-2 text-[11px] flex items-center justify-between"
              style={{ background: 'var(--win-surface-2)', color: 'var(--win-text-muted)', borderBottom: '1px solid var(--win-border)' }}
            >
              <span>{files.length}개 파일</span>
              {(doneCount > 0 || errorCount > 0) && (
                <span>
                  {doneCount > 0 && <span style={{ color: '#6ccb5f' }}>{doneCount}개 완료</span>}
                  {doneCount > 0 && errorCount > 0 && ' · '}
                  {errorCount > 0 && <span style={{ color: '#ff6b6b' }}>{errorCount}개 오류</span>}
                </span>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: 'var(--win-border)' }}>
              {files.map((f) => {
                const s = STATUS_STYLE[f.status]
                return (
                  <div
                    key={f.path}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{ background: 'var(--win-surface)' }}
                  >
                    {/* 파일 아이콘 */}
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={
                        f.status === 'dwg_warning'
                          ? { background: 'rgba(255,140,0,0.15)', color: '#ffa040' }
                          : { background: 'rgba(0,120,212,0.15)', color: '#60b0ff' }
                      }
                    >
                      {f.path.toLowerCase().endsWith('.dwg') ? 'DWG' : 'DXF'}
                    </div>

                    {/* 이름 + 안내 메시지 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] truncate" style={{ color: 'var(--win-text)' }}>{basename(f.path)}</div>
                      {f.status === 'dwg_warning' && (
                        <div className="text-[10px] mt-0.5" style={{ color: '#ffa040' }}>
                          AutoCAD에서 <strong>다른 이름으로 저장 → DXF</strong>로 변환 후 추가하세요
                        </div>
                      )}
                      {f.error && (
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: '#ff6b6b' }}>
                          {f.error}
                        </div>
                      )}
                    </div>

                    {/* 상태 */}
                    <span className={s.pill}>
                      {f.status === 'converting' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse mr-1" />
                      )}
                      {s.label}
                    </span>

                    {/* 완료 시 PDF 열기 */}
                    {f.status === 'done' && f.outputPath && (
                      <button
                        className="win-btn-secondary text-[11px]"
                        style={{ padding: '2px 8px', height: '22px' }}
                        onClick={() => window.api.cadConvert.openPdf(f.outputPath!)}
                      >
                        열기
                      </button>
                    )}

                    {/* 삭제 */}
                    {!converting && (
                      <button
                        className="win-btn-ghost text-[11px] w-5 h-5 flex items-center justify-center rounded"
                        style={{ padding: 0, color: 'var(--win-text-muted)' }}
                        onClick={() => removeFile(f.path)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 출력 폴더 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px]" style={{ color: 'var(--win-text-muted)' }}>저장 위치</label>
          <div className="flex gap-2">
            <input
              className="win-input flex-1 text-[12px]"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="저장 폴더 경로..."
            />
            <button className="win-btn-secondary text-[12px]" onClick={pickOutputDir}>
              찾기
            </button>
          </div>
        </div>

        {/* 안내 */}
        <div
          className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
          style={{ background: 'rgba(0,120,212,0.08)', border: '1px solid rgba(0,120,212,0.2)', color: '#60b0ff' }}
        >
          <strong>지원 형식:</strong> DXF (AutoCAD 2000 이상)<br />
          <span style={{ color: 'var(--win-text-muted)' }}>
            DWG 파일은 AutoCAD에서 <strong style={{ color: 'var(--win-text-sub)' }}>다른 이름으로 저장 → DXF</strong>로 변환 후 사용하세요.
          </span>
        </div>

        {/* 변환 버튼 */}
        <button
          className="win-btn-primary"
          onClick={convert}
          disabled={!files.length || converting}
          style={{ opacity: (!files.length || converting) ? 0.5 : 1 }}
        >
          {converting ? '변환 중...' : `PDF로 변환 (${files.length}개)`}
        </button>
      </div>
    </Modal>
  )
}
