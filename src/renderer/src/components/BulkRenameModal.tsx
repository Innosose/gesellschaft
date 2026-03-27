import React, { useState, useEffect } from 'react'
import { Modal } from './SearchModal'

interface FileItem {
  path: string
  name: string
  newName: string
  changed: boolean
}

type RenameMode = 'replace' | 'prefix' | 'suffix' | 'number' | 'extension'

export default function BulkRenameModal({
  onClose,
  initialFolder,
  asPanel
}: {
  onClose: () => void
  initialFolder?: string
  asPanel?: boolean
}): React.ReactElement {
  const [folder, setFolder] = useState(initialFolder || 'C:\\')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [extFilter, setExtFilter] = useState('')
  const [mode, setMode] = useState<RenameMode>('replace')

  // replace
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(false)

  // prefix / suffix
  const [affixText, setAffixText] = useState('')

  // number
  const [numStart, setNumStart] = useState('1')
  const [numStep, setNumStep] = useState('1')
  const [numPad, setNumPad] = useState('3')
  const [numSep, setNumSep] = useState('_')
  const [numPos, setNumPos] = useState<'before' | 'after'>('after')

  // extension
  const [newExt, setNewExt] = useState('')

  const [applying, setApplying] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)

  const loadFiles = async (): Promise<void> => {
    setLoading(true)
    setResults(null)
    const res = await window.api.fs.readDir(folder)
    if (res.success && res.data) {
      let items = res.data.filter((f) => !f.isDirectory)
      if (extFilter.trim()) {
        const exts = extFilter.split(',').map((e) => e.trim().toLowerCase()).map((e) => (e.startsWith('.') ? e : `.${e}`))
        items = items.filter((f) => exts.includes(f.extension.toLowerCase()))
      }
      setFiles(items.map((f) => ({ path: f.path, name: f.name, newName: f.name, changed: false })))
    }
    setLoading(false)
  }

  // 미리보기 계산
  useEffect(() => {
    setFiles((prev) =>
      prev.map((f, i) => {
        const newName = computeNewName(f.name, i)
        return { ...f, newName, changed: newName !== f.name }
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, findText, replaceText, useRegex, affixText, numStart, numStep, numPad, numSep, numPos, newExt])

  const computeNewName = (name: string, index: number): string => {
    const dotIdx = name.lastIndexOf('.')
    const base = dotIdx > 0 ? name.slice(0, dotIdx) : name
    const ext = dotIdx > 0 ? name.slice(dotIdx) : ''

    switch (mode) {
      case 'replace': {
        try {
          const pattern = useRegex ? new RegExp(findText, 'g') : findText
          const replaced = findText ? base.replace(pattern, replaceText) : base
          return replaced + ext
        } catch {
          return name
        }
      }
      case 'prefix':
        return affixText + name
      case 'suffix':
        return base + affixText + ext
      case 'number': {
        const n = (parseInt(numStart) || 1) + index * (parseInt(numStep) || 1)
        const padded = String(n).padStart(parseInt(numPad) || 1, '0')
        return numPos === 'before' ? padded + numSep + name : base + numSep + padded + ext
      }
      case 'extension':
        return newExt ? base + (newExt.startsWith('.') ? newExt : `.${newExt}`) : name
      default:
        return name
    }
  }

  const apply = async (): Promise<void> => {
    const toRename = files.filter((f) => f.changed && f.newName.trim())
    if (toRename.length === 0) return
    setApplying(true)
    const items = toRename.map((f) => ({ path: f.path, newName: f.newName }))
    const res = await window.api.fs.bulkRename(items)
    const success = res.filter((r) => r.success).length
    const failed = res.filter((r) => !r.success).length
    setResults({ success, failed })
    setApplying(false)
    await loadFiles()
  }

  const changedCount = files.filter((f) => f.changed).length

  return (
    <Modal title="일괄 이름 변경" onClose={onClose} wide asPanel={asPanel}>
      <div className="space-y-3">
        {/* 폴더 선택 */}
        <div className="flex gap-2">
          <input
            className="win-input flex-1 text-sm"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="폴더 경로"
          />
          <button
            className="win-btn-secondary text-sm"
            onClick={async () => {
              const dir = await window.api.dialog.openDirectory()
              if (dir) setFolder(dir)
            }}
          >
            찾기
          </button>
          <input
            className="win-input w-36 text-sm"
            value={extFilter}
            onChange={(e) => setExtFilter(e.target.value)}
            placeholder="확장자 필터 (.jpg)"
          />
          <button className="win-btn-primary text-sm" onClick={loadFiles} disabled={loading}>
            {loading ? '로딩...' : '📂 불러오기'}
          </button>
        </div>

        {files.length > 0 && (
          <>
            {/* 변경 방식 선택 */}
            <div className="flex gap-1 flex-wrap">
              {(['replace', 'prefix', 'suffix', 'number', 'extension'] as RenameMode[]).map((m) => (
                <button
                  key={m}
                  className={`text-xs px-3 py-1.5 rounded transition-colors ${mode === m ? 'bg-[#0078d4] text-white' : 'text-xs px-3 py-1.5 rounded transition-colors'}`}
                  style={mode !== m ? { background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' } : undefined}
                  onClick={() => setMode(m)}
                >
                  {{ replace: '텍스트 치환', prefix: '접두사 추가', suffix: '접미사 추가', number: '번호 매기기', extension: '확장자 변경' }[m]}
                </button>
              ))}
            </div>

            {/* 옵션 패널 */}
            <div className="rounded p-3 text-xs space-y-2" style={{ background: 'var(--win-bg)' }}>
              {mode === 'replace' && (
                <>
                  <div className="flex gap-2 items-center">
                    <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>찾기</label>
                    <input className="win-input flex-1 text-xs" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="찾을 텍스트" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>바꾸기</label>
                    <input className="win-input flex-1 text-xs" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="바꿀 텍스트 (비워두면 삭제)" />
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--win-text-sub)' }}>
                    <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="accent-[#0078d4]" />
                    정규식 사용
                  </label>
                </>
              )}
              {(mode === 'prefix' || mode === 'suffix') && (
                <div className="flex gap-2 items-center">
                  <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>{mode === 'prefix' ? '접두사' : '접미사'}</label>
                  <input className="win-input flex-1 text-xs" value={affixText} onChange={(e) => setAffixText(e.target.value)} placeholder={mode === 'prefix' ? '파일명 앞에 추가' : '파일명 뒤에 추가 (확장자 제외)'} />
                </div>
              )}
              {mode === 'number' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex gap-2 items-center">
                    <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>시작 번호</label>
                    <input className="win-input flex-1 text-xs" type="number" value={numStart} onChange={(e) => setNumStart(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="w-12" style={{ color: 'var(--win-text-muted)' }}>증가값</label>
                    <input className="win-input flex-1 text-xs" type="number" value={numStep} onChange={(e) => setNumStep(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>자릿수</label>
                    <input className="win-input flex-1 text-xs" type="number" value={numPad} onChange={(e) => setNumPad(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="w-12" style={{ color: 'var(--win-text-muted)' }}>구분자</label>
                    <input className="win-input flex-1 text-xs" value={numSep} onChange={(e) => setNumSep(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-center col-span-2">
                    <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>위치</label>
                    <select className="win-input text-xs" value={numPos} onChange={(e) => setNumPos(e.target.value as 'before' | 'after')}>
                      <option value="after">뒤 (파일명_001)</option>
                      <option value="before">앞 (001_파일명)</option>
                    </select>
                  </div>
                </div>
              )}
              {mode === 'extension' && (
                <div className="flex gap-2 items-center">
                  <label className="w-16" style={{ color: 'var(--win-text-muted)' }}>새 확장자</label>
                  <input className="win-input flex-1 text-xs" value={newExt} onChange={(e) => setNewExt(e.target.value)} placeholder=".txt 또는 txt" />
                </div>
              )}
            </div>

            {/* 결과 메시지 */}
            {results && (
              <div className={`text-xs px-3 py-2 rounded ${results.failed > 0 ? 'bg-[#c42b1c20] text-[#c42b1c]' : 'bg-[#0078d420] text-[#0078d4]'}`}>
                완료: {results.success}개 성공{results.failed > 0 ? ` · ${results.failed}개 실패` : ''}
              </div>
            )}

            {/* 적용 버튼 */}
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--win-text-muted)' }}>{changedCount}개 변경 예정 / 전체 {files.length}개</span>
              <button
                className="win-btn-primary text-sm"
                onClick={apply}
                disabled={changedCount === 0 || applying}
              >
                {applying ? '적용 중...' : `✏️ ${changedCount}개 적용`}
              </button>
            </div>

            {/* 미리보기 목록 */}
            <div className="rounded overflow-hidden" style={{ border: '1px solid var(--win-border)' }}>
              <div className="px-3 py-1.5 grid grid-cols-2 text-xs font-medium" style={{ background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' }}>
                <span>현재 이름</span>
                <span>변경 후</span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {files.map((f) => (
                  <div key={f.path} className={`grid grid-cols-2 gap-2 px-3 py-1.5 text-xs ${f.changed ? 'bg-[#0078d40a]' : ''}`} style={{ borderBottom: '1px solid var(--win-surface)' }}>
                    <span className="truncate" style={{ color: 'var(--win-text-sub)' }} title={f.name}>{f.name}</span>
                    <span className={`truncate font-medium ${f.changed ? 'text-[#0078d4]' : ''}`} style={!f.changed ? { color: 'var(--win-text-muted)' } : undefined} title={f.newName}>
                      {f.newName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
            <div className="text-4xl mb-2">✏️</div>
            <div className="text-sm">폴더를 선택하고 불러오기를 눌러주세요.</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
