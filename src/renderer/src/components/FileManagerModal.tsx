import React, { useState, useEffect, useRef } from 'react'
import { Modal } from './SearchModal'
import { formatSize, formatDate, getFileIcon } from '../utils/format'

// ─── Types shared across tabs ───────────────────────────────────────────────

export interface SearchResult {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modified: number
  matchedContent?: string
}

interface SearchOptions {
  query: string
  rootPath: string
  includeFiles: boolean
  includeDirs: boolean
  extensions: string
  minSize: string
  maxSize: string
  caseSensitive: boolean
  regex: boolean
  contentSearch: boolean
}

interface FileItem {
  path: string
  name: string
  newName: string
  changed: boolean
}

type RenameMode = 'replace' | 'prefix' | 'suffix' | 'number' | 'extension'

interface CompareEntry {
  relativePath: string
  name: string
  status: 'only_a' | 'only_b' | 'modified' | 'same'
  sizeA?: number
  sizeB?: number
  modifiedA?: number
  modifiedB?: number
}

type FilterType = 'all' | 'only_a' | 'only_b' | 'modified' | 'same'

const STATUS_STYLE = {
  only_a:   { label: 'A만 존재', bg: 'bg-[#3b82f620]', text: 'text-[#3b82f6]', dot: '#3b82f6' },
  only_b:   { label: 'B만 존재', bg: 'bg-[#22c55e20]', text: 'text-[#22c55e]', dot: '#22c55e' },
  modified: { label: '내용 다름', bg: 'bg-[#f9731620]', text: 'text-[#f97316]', dot: '#f97316' },
  same:     { label: '동일',     bg: '',                text: '',               dot: 'var(--win-text-muted)' },
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function CheckOpt({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <label className="flex items-center gap-1 cursor-pointer" style={{ color: 'var(--win-text-sub)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#0078d4]" />
      {label}
    </label>
  )
}

// ─── Tab: 파일 검색 ───────────────────────────────────────────────────────────

function SearchTab(): React.ReactElement {
  const [opts, setOpts] = useState<SearchOptions>({
    query: '',
    rootPath: 'C:\\',
    includeFiles: true,
    includeDirs: true,
    extensions: '',
    minSize: '',
    maxSize: '',
    caseSensitive: false,
    regex: false,
    contentSearch: false,
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedFile, setSelectedFile] = useState<SearchResult | null>(null)
  const [fileNote, setFileNote] = useState('')
  const [fileTags, setFileTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const off = window.api.search.onProgress((count: number) => setProgress(count))
    return () => off()
  }, [])

  useEffect(() => {
    if (!selectedFile) return
    window.api.notes.get(selectedFile.path).then(setFileNote)
    window.api.tags.get(selectedFile.path).then(setFileTags)
  }, [selectedFile?.path])

  const doSearch = async (): Promise<void> => {
    setSearching(true)
    setResults([])
    setProgress(0)
    setSelectedFile(null)
    const options = {
      query: opts.query,
      rootPath: opts.rootPath,
      includeFiles: opts.includeFiles,
      includeDirs: opts.includeDirs,
      extensions: opts.extensions
        ? opts.extensions.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).map((e) => (e.startsWith('.') ? e : `.${e}`))
        : undefined,
      minSize: opts.minSize ? parseInt(opts.minSize) * 1024 : undefined,
      maxSize: opts.maxSize ? parseInt(opts.maxSize) * 1024 : undefined,
      caseSensitive: opts.caseSensitive,
      regex: opts.regex,
      contentSearch: opts.contentSearch,
    }
    const res = await window.api.search.files(options)
    if (res.success) setResults(res.data)
    setSearching(false)
  }

  const cancel = (): void => {
    window.api.search.cancel()
    setSearching(false)
  }

  const saveSmartFolder = async (): Promise<void> => {
    const name = window.prompt('스마트 폴더 이름:')
    if (!name) return
    const folder = {
      id: `sf-${Date.now()}`,
      name,
      options: {
        query: opts.query,
        rootPath: opts.rootPath,
        includeFiles: opts.includeFiles,
        includeDirs: opts.includeDirs,
        extensions: opts.extensions ? opts.extensions.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        minSize: opts.minSize ? parseInt(opts.minSize) * 1024 : undefined,
        maxSize: opts.maxSize ? parseInt(opts.maxSize) * 1024 : undefined,
        caseSensitive: opts.caseSensitive,
        regex: opts.regex,
        contentSearch: opts.contentSearch,
      },
    }
    await window.api.smartFolders.save(folder)
  }

  const addTag = async (): Promise<void> => {
    if (!newTag.trim() || !selectedFile) return
    const updated = [...new Set([...fileTags, newTag.trim()])]
    setFileTags(updated)
    setNewTag('')
    await window.api.tags.set(selectedFile.path, updated)
  }

  const removeTag = async (tag: string): Promise<void> => {
    if (!selectedFile) return
    const updated = fileTags.filter((t) => t !== tag)
    setFileTags(updated)
    await window.api.tags.set(selectedFile.path, updated)
  }

  const saveNote = async (): Promise<void> => {
    if (!selectedFile) return
    await window.api.notes.set(selectedFile.path, fileNote)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>검색 위치</label>
        <input
          className="win-input flex-1 text-xs"
          value={opts.rootPath}
          onChange={(e) => setOpts({ ...opts, rootPath: e.target.value })}
        />
        <button
          className="win-btn-secondary text-xs"
          onClick={async () => {
            const dir = await window.api.dialog.openDirectory()
            if (dir) setOpts({ ...opts, rootPath: dir })
          }}
        >
          찾기
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>검색어</label>
        <input
          ref={inputRef}
          className="win-input flex-1 text-xs"
          placeholder="파일명 또는 내용 검색..."
          value={opts.query}
          onChange={(e) => setOpts({ ...opts, query: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && !searching && doSearch()}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--win-text-sub)' }}>
        <CheckOpt label="파일" checked={opts.includeFiles} onChange={(v) => setOpts({ ...opts, includeFiles: v })} />
        <CheckOpt label="폴더" checked={opts.includeDirs} onChange={(v) => setOpts({ ...opts, includeDirs: v })} />
        <CheckOpt label="대소문자" checked={opts.caseSensitive} onChange={(v) => setOpts({ ...opts, caseSensitive: v })} />
        <CheckOpt label="정규식" checked={opts.regex} onChange={(v) => setOpts({ ...opts, regex: v })} />
        <CheckOpt label="내용 검색" checked={opts.contentSearch} onChange={(v) => setOpts({ ...opts, contentSearch: v })} />
        <button className="text-[#0078d4] hover:underline" onClick={() => setShowAdvanced(!showAdvanced)}>
          고급 {showAdvanced ? '▲' : '▼'}
        </button>
      </div>

      {showAdvanced && (
        <div className="rounded p-3 space-y-2 text-xs" style={{ background: 'var(--win-surface-2)', border: '1px solid var(--win-border)' }}>
          <div className="flex gap-2 items-center">
            <label className="w-20" style={{ color: 'var(--win-text-muted)' }}>확장자 (,로 구분)</label>
            <input className="win-input flex-1 text-xs" placeholder=".jpg,.png,.pdf" value={opts.extensions} onChange={(e) => setOpts({ ...opts, extensions: e.target.value })} />
          </div>
          <div className="flex gap-2 items-center">
            <label className="w-20" style={{ color: 'var(--win-text-muted)' }}>최소 크기 (KB)</label>
            <input className="win-input w-32 text-xs" type="number" placeholder="0" value={opts.minSize} onChange={(e) => setOpts({ ...opts, minSize: e.target.value })} />
          </div>
          <div className="flex gap-2 items-center">
            <label className="w-20" style={{ color: 'var(--win-text-muted)' }}>최대 크기 (KB)</label>
            <input className="win-input w-32 text-xs" type="number" placeholder="∞" value={opts.maxSize} onChange={(e) => setOpts({ ...opts, maxSize: e.target.value })} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {searching ? (
          <button className="win-btn-danger flex-1 text-sm" onClick={cancel}>
            취소 (검색 중... {progress}개 발견)
          </button>
        ) : (
          <>
            <button className="win-btn-primary flex-1 text-sm" onClick={doSearch}>🔍 검색</button>
            <button className="win-btn-secondary text-sm px-3" title="스마트 폴더로 저장" onClick={saveSmartFolder}>⭐ 저장</button>
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded overflow-hidden" style={{ border: '1px solid var(--win-border)' }}>
          <div className="px-3 py-1.5 text-xs" style={{ background: 'var(--win-surface-2)', color: 'var(--win-text-muted)', borderBottom: '1px solid var(--win-border)' }}>{results.length}개 결과</div>
          <div className="max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer group"
                style={{
                  background: selectedFile?.path === r.path ? 'var(--win-accent-dim)' : 'var(--win-surface)',
                  borderBottom: '1px solid var(--win-border)',
                }}
                onMouseEnter={(e) => { if (selectedFile?.path !== r.path) (e.currentTarget as HTMLDivElement).style.background = 'var(--win-surface-2)' }}
                onMouseLeave={(e) => { if (selectedFile?.path !== r.path) (e.currentTarget as HTMLDivElement).style.background = 'var(--win-surface)' }}
                onClick={() => setSelectedFile(selectedFile?.path === r.path ? null : r)}
              >
                <span className="text-base">{getFileIcon(r.name.includes('.') ? `.${r.name.split('.').pop()}` : '', r.isDirectory)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--win-text)' }}>{r.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--win-text-muted)' }}>{r.path}</div>
                  {r.matchedContent && <div className="text-xs text-[#0078d4] truncate mt-0.5">{r.matchedContent}</div>}
                </div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>{r.isDirectory ? '폴더' : formatSize(r.size)}</div>
                <div className="text-xs flex-shrink-0" style={{ color: 'var(--win-text-muted)' }}>{formatDate(r.modified)}</div>
                <button className="text-xs opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }} onClick={(e) => { e.stopPropagation(); window.api.fs.showInExplorer(r.path) }} title="탐색기에서 보기">📁</button>
                <button className="text-xs opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: 'var(--win-text-muted)' }} onClick={(e) => { e.stopPropagation(); window.api.fs.open(r.path) }} title="열기">↗</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="rounded p-3 space-y-3" style={{ background: 'var(--win-surface-2)', border: '1px solid var(--win-border)' }}>
          <div className="text-xs font-medium truncate" style={{ color: 'var(--win-text-sub)' }}>{selectedFile.name}</div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--win-text-muted)' }}>태그</div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {fileTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-[#0078d420] border border-[#0078d440] text-[#0078d4] px-2 py-0.5 rounded-full text-xs">
                  {tag}
                  <button style={{ color: 'inherit' }} onClick={() => removeTag(tag)}>✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input className="win-input flex-1 text-xs" placeholder="태그 추가..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} />
              <button className="win-btn-secondary text-xs px-2" onClick={addTag}>+</button>
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--win-text-muted)' }}>메모</div>
            <textarea className="win-input w-full text-xs resize-none" rows={2} value={fileNote} onChange={(e) => setFileNote(e.target.value)} placeholder="메모..." />
            <button className="win-btn-secondary text-xs mt-1" onClick={saveNote}>저장</button>
          </div>
        </div>
      )}

      {!searching && results.length === 0 && opts.query && (
        <div className="text-center text-sm py-4" style={{ color: 'var(--win-text-muted)' }}>검색 결과가 없습니다.</div>
      )}
    </div>
  )
}

// ─── Tab: 이름 변경 ───────────────────────────────────────────────────────────

function BulkRenameTab(): React.ReactElement {
  const [folder, setFolder] = useState('C:\\')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [extFilter, setExtFilter] = useState('')
  const [mode, setMode] = useState<RenameMode>('replace')

  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [affixText, setAffixText] = useState('')
  const [numStart, setNumStart] = useState('1')
  const [numStep, setNumStep] = useState('1')
  const [numPad, setNumPad] = useState('3')
  const [numSep, setNumSep] = useState('_')
  const [numPos, setNumPos] = useState<'before' | 'after'>('after')
  const [newExt, setNewExt] = useState('')
  const [applying, setApplying] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)
  const [regexError, setRegexError] = useState('')

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

  useEffect(() => {
    if (mode === 'replace' && useRegex && findText) {
      try {
        new RegExp(findText)
        setRegexError('')
      } catch (e: unknown) {
        setRegexError(e instanceof Error ? e.message : '잘못된 정규식')
        return
      }
    } else {
      setRegexError('')
    }
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
      case 'prefix': return affixText + name
      case 'suffix': return base + affixText + ext
      case 'number': {
        const n = (parseInt(numStart) || 1) + index * (parseInt(numStep) || 1)
        const padded = String(n).padStart(parseInt(numPad) || 1, '0')
        return numPos === 'before' ? padded + numSep + name : base + numSep + padded + ext
      }
      case 'extension': return newExt ? base + (newExt.startsWith('.') ? newExt : `.${newExt}`) : name
      default: return name
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
    <div className="space-y-3">
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
                {regexError && (
                  <div className="text-xs px-2 py-1 rounded" style={{ background: '#c42b1c20', color: '#c42b1c', border: '1px solid #c42b1c40' }}>
                    ⚠️ 잘못된 정규식: {regexError}
                  </div>
                )}
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

          {results && (
            <div className={`text-xs px-3 py-2 rounded ${results.failed > 0 ? 'bg-[#c42b1c20] text-[#c42b1c]' : 'bg-[#0078d420] text-[#0078d4]'}`}>
              완료: {results.success}개 성공{results.failed > 0 ? ` · ${results.failed}개 실패` : ''}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--win-text-muted)' }}>{changedCount}개 변경 예정 / 전체 {files.length}개</span>
            <button className="win-btn-primary text-sm" onClick={apply} disabled={changedCount === 0 || applying}>
              {applying ? '적용 중...' : `✏️ ${changedCount}개 적용`}
            </button>
          </div>

          <div className="rounded overflow-hidden" style={{ border: '1px solid var(--win-border)' }}>
            <div className="px-3 py-1.5 grid grid-cols-2 text-xs font-medium" style={{ background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' }}>
              <span>현재 이름</span>
              <span>변경 후</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {files.map((f) => (
                <div key={f.path} className={`grid grid-cols-2 gap-2 px-3 py-1.5 text-xs ${f.changed ? 'bg-[#0078d40a]' : ''}`} style={{ borderBottom: '1px solid var(--win-surface)' }}>
                  <span className="truncate" style={{ color: 'var(--win-text-sub)' }} title={f.name}>{f.name}</span>
                  <span className={`truncate font-medium ${f.changed ? 'text-[#0078d4]' : ''}`} style={!f.changed ? { color: 'var(--win-text-muted)' } : undefined} title={f.newName}>{f.newName}</span>
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
  )
}

// ─── Tab: 폴더 비교 ───────────────────────────────────────────────────────────

function FolderCompareTab(): React.ReactElement {
  const [pathA, setPathA] = useState('')
  const [pathB, setPathB] = useState('')
  const [comparing, setComparing] = useState(false)
  const [results, setResults] = useState<CompareEntry[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [hideSame, setHideSame] = useState(false)

  const compare = async (): Promise<void> => {
    if (!pathA || !pathB) return
    setComparing(true)
    setResults([])
    const res = await window.api.folderCompare.compare(pathA, pathB)
    if (res.success && res.data) setResults(res.data)
    setComparing(false)
  }

  const counts = {
    only_a:   results.filter((r) => r.status === 'only_a').length,
    only_b:   results.filter((r) => r.status === 'only_b').length,
    modified: results.filter((r) => r.status === 'modified').length,
    same:     results.filter((r) => r.status === 'same').length,
  }

  const filtered = results.filter((r) => {
    if (hideSame && r.status === 'same') return false
    if (filter === 'all') return true
    return r.status === filter
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: 'var(--win-text-muted)' }}>폴더 A (기준)</label>
          <div className="flex gap-1">
            <input className="win-input flex-1 text-xs" value={pathA} onChange={(e) => setPathA(e.target.value)} placeholder="기준 폴더 경로" />
            <button
              className="win-btn-secondary text-xs"
              onClick={async () => {
                const dir = await window.api.dialog.openDirectory()
                if (dir) setPathA(dir)
              }}
            >
              찾기
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: 'var(--win-text-muted)' }}>폴더 B (비교 대상)</label>
          <div className="flex gap-1">
            <input className="win-input flex-1 text-xs" value={pathB} onChange={(e) => setPathB(e.target.value)} placeholder="비교할 폴더 경로" />
            <button
              className="win-btn-secondary text-xs"
              onClick={async () => {
                const dir = await window.api.dialog.openDirectory()
                if (dir) setPathB(dir)
              }}
            >
              찾기
            </button>
          </div>
        </div>
      </div>

      <button
        className="win-btn-primary w-full text-sm"
        onClick={compare}
        disabled={comparing || !pathA || !pathB}
      >
        {comparing ? '비교 중...' : '🔍 비교 시작'}
      </button>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {(['only_a', 'only_b', 'modified', 'same'] as const).map((s) => (
              <button
                key={s}
                className={`p-2 rounded-lg border text-center transition-colors ${filter === s ? 'border-[#0078d4] bg-[#0078d420]' : ''}`}
                style={filter !== s ? { borderColor: 'var(--win-border)' } : undefined}
                onClick={() => setFilter(filter === s ? 'all' : s)}
              >
                <div className="text-xl font-bold" style={{ color: STATUS_STYLE[s].dot }}>{counts[s]}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--win-text-muted)' }}>{STATUS_STYLE[s].label}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--win-text-muted)' }}>전체 {results.length}개 파일</span>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--win-text-muted)' }}>
              <input type="checkbox" checked={hideSame} onChange={(e) => setHideSame(e.target.checked)} className="accent-[#0078d4]" />
              동일 파일 숨기기
            </label>
          </div>

          <div className="rounded overflow-hidden" style={{ border: '1px solid var(--win-border)' }}>
            <div className="grid grid-cols-[20px_1fr_140px_140px] gap-2 px-3 py-1.5 text-[10px] font-medium" style={{ background: 'var(--win-surface-2)', color: 'var(--win-text-muted)' }}>
              <span />
              <span>경로</span>
              <span>폴더 A</span>
              <span>폴더 B</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--win-text-muted)' }}>해당 항목 없음</div>
              )}
              {filtered.map((entry, i) => {
                const s = STATUS_STYLE[entry.status]
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[20px_1fr_140px_140px] gap-2 px-3 py-1.5 text-xs items-center ${s.bg}`}
                    style={{ borderBottom: '1px solid var(--win-surface)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--win-surface-2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '' }}
                  >
                    <span title={s.label} style={{ color: s.dot }}>●</span>
                    <span className={`truncate ${s.text}`} title={entry.relativePath}>{entry.relativePath}</span>
                    <span className="truncate" style={{ color: 'var(--win-text-muted)' }}>
                      {entry.sizeA !== undefined && entry.modifiedA !== undefined
                        ? `${formatSize(entry.sizeA)} · ${formatDate(entry.modifiedA)}`
                        : <span style={{ color: 'var(--win-border)' }}>없음</span>}
                    </span>
                    <span className="truncate" style={{ color: 'var(--win-text-muted)' }}>
                      {entry.sizeB !== undefined && entry.modifiedB !== undefined
                        ? `${formatSize(entry.sizeB)} · ${formatDate(entry.modifiedB)}`
                        : <span style={{ color: 'var(--win-border)' }}>없음</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!comparing && results.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
          <div className="text-4xl mb-2">📁</div>
          <div className="text-sm">두 폴더를 선택하고 비교를 시작하세요.</div>
          <div className="text-xs mt-1" style={{ color: 'var(--win-border)' }}>하위 폴더까지 모두 비교합니다.</div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'search' | 'rename' | 'compare'

const TABS: { id: TabId; label: string }[] = [
  { id: 'search',  label: '파일 검색' },
  { id: 'rename',  label: '이름 변경' },
  { id: 'compare', label: '폴더 비교' },
]

export default function FileManagerModal({
  onClose,
  asPanel,
}: {
  onClose: () => void
  asPanel?: boolean
}): React.ReactElement {
  const [tab, setTab] = useState<TabId>('search')

  return (
    <Modal title="파일 관리" onClose={onClose} wide asPanel={asPanel}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '5px 16px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: tab === t.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'search'  && <SearchTab />}
      {tab === 'rename'  && <BulkRenameTab />}
      {tab === 'compare' && <FolderCompareTab />}
    </Modal>
  )
}
