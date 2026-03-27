import React from 'react'
import { Modal } from './SearchModal'

interface ExcelToolModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function ExcelToolModal({ onClose, asPanel }: ExcelToolModalProps): React.ReactElement {
  const [filePath, setFilePath] = React.useState('')
  const [sheets, setSheets] = React.useState<string[]>([])
  const [activeSheet, setActiveSheet] = React.useState('')
  const [columns, setColumns] = React.useState<string[]>([])
  const [selectedCols, setSelectedCols] = React.useState<Set<string>>(new Set())
  const [previewRows, setPreviewRows] = React.useState<string[][]>([])
  const [filterText, setFilterText] = React.useState('')
  const [outputFormat, setOutputFormat] = React.useState<'csv' | 'xlsx'>('csv')
  const [outputPath, setOutputPath] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [exportDone, setExportDone] = React.useState(false)
  const [exportError, setExportError] = React.useState('')

  const handleOpenFile = async (): Promise<void> => {
    const files: string[] = await window.api.excelTool.openFiles()
    if (!files || files.length === 0) return
    const fp = files[0]
    setFilePath(fp)
    setLoading(true)
    setExportDone(false)
    setExportError('')
    try {
      const result = await window.api.excelTool.loadFile(fp)
      const sheetNames: string[] = result.sheets
      setSheets(sheetNames)
      const first = sheetNames[0] || ''
      setActiveSheet(first)
      const cols: string[] = result.data[first]?.[0] || []
      setColumns(cols)
      setSelectedCols(new Set(cols))
      setPreviewRows(result.data[first]?.slice(1, 51) || [])
      setOutputPath(result.defaultOutputPath || '')
    } catch {
      setExportError('파일 로드 중 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const handleSheetChange = async (sheetName: string): Promise<void> => {
    setActiveSheet(sheetName)
    setLoading(true)
    try {
      const result = await window.api.excelTool.loadSheet(filePath, sheetName)
      const cols: string[] = result[0] || []
      setColumns(cols)
      setSelectedCols(new Set(cols))
      setPreviewRows(result.slice(1, 51))
    } catch {
      setExportError('시트 로드 중 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const toggleCol = (col: string): void => {
    setSelectedCols(prev => {
      const s = new Set(prev)
      if (s.has(col)) s.delete(col)
      else s.add(col)
      return s
    })
  }

  const filteredRows = previewRows.filter(row =>
    !filterText || row.some(cell => String(cell).toLowerCase().includes(filterText.toLowerCase()))
  )

  const handleBrowseOutput = async (): Promise<void> => {
    const p: string = await window.api.excelTool.openOutputPath(outputFormat)
    if (p) setOutputPath(p)
  }

  const handleExport = async (): Promise<void> => {
    if (!filePath) return
    setExporting(true)
    setExportDone(false)
    setExportError('')
    try {
      const result = await window.api.excelTool.export({
        filePath,
        sheet: activeSheet,
        columns: [...selectedCols],
        filterText,
        outputFormat,
        outputPath,
      })
      if (result?.success === false) {
        setExportError(result.error || '내보내기 중 오류가 발생했습니다.')
      } else {
        setExportDone(true)
      }
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : '내보내기 중 오류가 발생했습니다.')
    }
    setExporting(false)
  }

  const colIndices = columns.map((c, i) => i).filter(i => selectedCols.has(columns[i]))

  return (
    <Modal title="Excel / CSV 가공기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 파일 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="win-btn-primary" onClick={handleOpenFile}>파일 열기</button>
          {filePath && (
            <span style={{ fontSize: 12, color: 'var(--win-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {filePath.split(/[\\/]/).pop()}
            </span>
          )}
          {loading && <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>⏳ 로딩 중...</span>}
        </div>

        {filePath && !loading && (
          <>
            {/* 시트 탭 */}
            {sheets.length > 1 && (
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--win-border)', overflowX: 'auto' }}>
                {sheets.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSheetChange(s)}
                    style={{
                      padding: '6px 16px',
                      background: activeSheet === s ? 'var(--win-accent)' : 'transparent',
                      color: activeSheet === s ? '#fff' : 'var(--win-text-sub)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: activeSheet === s ? 600 : 400,
                      whiteSpace: 'nowrap',
                      borderRadius: '4px 4px 0 0',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* 컬럼 선택 */}
            {columns.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>
                  컬럼 선택 ({selectedCols.size}/{columns.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {columns.map(col => (
                    <label
                      key={col}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: selectedCols.has(col) ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: selectedCols.has(col) ? 'var(--win-accent)' : 'var(--win-text-muted)',
                        border: '1px solid var(--win-border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCols.has(col)}
                        onChange={() => toggleCol(col)}
                        style={{ marginRight: 2 }}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 필터 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--win-text-sub)', whiteSpace: 'nowrap' }}>행 필터:</span>
              <input
                className="win-input"
                style={{ flex: 1 }}
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="포함할 텍스트 입력..."
              />
              {filterText && (
                <span style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>
                  {filteredRows.length}행
                </span>
              )}
            </div>

            {/* 미리보기 테이블 */}
            <div
              style={{
                flex: 1,
                overflowAuto: 'auto',
                overflow: 'auto',
                border: '1px solid var(--win-border)',
                borderRadius: 6,
                background: 'var(--win-surface-2)',
                minHeight: 120,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--win-surface-3)' }}>
                    {colIndices.map(i => (
                      <th
                        key={i}
                        style={{
                          padding: '6px 10px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: 'var(--win-text-sub)',
                          borderBottom: '1px solid var(--win-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {columns[i]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, ri) => (
                    <tr
                      key={ri}
                      style={{ borderBottom: '1px solid var(--win-border)' }}
                    >
                      {colIndices.map(i => (
                        <td
                          key={i}
                          style={{
                            padding: '5px 10px',
                            color: 'var(--win-text)',
                            whiteSpace: 'nowrap',
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {String(row[i] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13 }}>
                  표시할 데이터가 없습니다
                </div>
              )}
            </div>

            {/* 출력 옵션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--win-text-sub)', whiteSpace: 'nowrap' }}>출력 형식:</span>
              <select
                className="win-select"
                value={outputFormat}
                onChange={e => setOutputFormat(e.target.value as 'csv' | 'xlsx')}
                style={{ width: 120 }}
              >
                <option value="csv">CSV (UTF-8 BOM)</option>
                <option value="xlsx">XLSX (Excel)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="win-input"
                style={{ flex: 1 }}
                value={outputPath}
                onChange={e => setOutputPath(e.target.value)}
                placeholder="출력 파일 경로..."
              />
              <button className="win-btn-secondary" onClick={handleBrowseOutput}>찾기</button>
            </div>

            {outputFormat === 'csv' && (
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
                ℹ️ CSV 내보내기 시 한국어 호환성을 위해 UTF-8 BOM 인코딩이 적용됩니다.
              </div>
            )}

            {exportDone && (
              <div style={{ padding: '10px 14px', background: 'var(--win-success)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
                ✅ 내보내기 완료!
              </div>
            )}
            {exportError && (
              <div style={{ padding: '10px 14px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
                ⚠️ {exportError}
              </div>
            )}

            <button
              className="win-btn-primary"
              onClick={handleExport}
              disabled={exporting || selectedCols.size === 0}
              style={{ alignSelf: 'flex-start' }}
            >
              {exporting ? '⏳ 내보내는 중...' : '내보내기'}
            </button>
          </>
        )}

        {!filePath && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--win-border)',
              borderRadius: 8,
              color: 'var(--win-text-muted)',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onClick={handleOpenFile}
          >
            Excel (.xlsx) 또는 CSV 파일을 열어주세요
          </div>
        )}
      </div>
    </Modal>
  )
}
