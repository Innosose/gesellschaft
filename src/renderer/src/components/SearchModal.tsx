import React, { useState, useEffect, useRef } from 'react'
import { formatSize, formatDate, getFileIcon } from '../utils/format'

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

export default function SearchModal({
  onClose,
  initialFolder,
  initialOptions,
  tagMode,
  asPanel
}: {
  onClose: () => void
  initialFolder?: string
  initialOptions?: SmartFolder['options']
  tagMode?: boolean
  asPanel?: boolean
}): React.ReactElement {
  const [opts, setOpts] = useState<SearchOptions>({
    query: initialOptions?.query || '',
    rootPath: initialOptions?.rootPath || initialFolder || 'C:\\',
    includeFiles: initialOptions?.includeFiles ?? true,
    includeDirs: initialOptions?.includeDirs ?? true,
    extensions: initialOptions?.extensions?.join(',') || '',
    minSize: initialOptions?.minSize ? String(Math.round(initialOptions.minSize / 1024)) : '',
    maxSize: initialOptions?.maxSize ? String(Math.round(initialOptions.maxSize / (1024 * 1024))) : '',
    caseSensitive: initialOptions?.caseSensitive ?? false,
    regex: initialOptions?.regex ?? false,
    contentSearch: initialOptions?.contentSearch ?? false
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

  const title = tagMode ? '태그 & 메모 검색' : '고급 검색'

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
      maxSize: opts.maxSize ? parseInt(opts.maxSize) * 1024 * 1024 : undefined,
      caseSensitive: opts.caseSensitive,
      regex: opts.regex,
      contentSearch: opts.contentSearch
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
    const folder: SmartFolder = {
      id: `sf-${Date.now()}`,
      name,
      options: {
        query: opts.query,
        rootPath: opts.rootPath,
        includeFiles: opts.includeFiles,
        includeDirs: opts.includeDirs,
        extensions: opts.extensions
          ? opts.extensions.split(',').map((e) => e.trim()).filter(Boolean)
          : undefined,
        minSize: opts.minSize ? parseInt(opts.minSize) * 1024 : undefined,
        maxSize: opts.maxSize ? parseInt(opts.maxSize) * 1024 * 1024 : undefined,
        caseSensitive: opts.caseSensitive,
        regex: opts.regex,
        contentSearch: opts.contentSearch
      }
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
    <Modal title={title} onClose={onClose} asPanel={asPanel}>
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
              <label className="w-20" style={{ color: 'var(--win-text-muted)' }}>최대 크기 (MB)</label>
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

        {/* Results */}
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

        {/* 선택된 파일의 태그 & 메모 */}
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
    </Modal>
  )
}

function CheckOpt({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <label className="flex items-center gap-1 cursor-pointer" style={{ color: 'var(--win-text-sub)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#0078d4]" />
      {label}
    </label>
  )
}

export function Modal({ title, onClose, children, wide, asPanel }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; asPanel?: boolean }): React.ReactElement {
  if (asPanel) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden h-full">
        <div className="panel-header">{title}</div>
        <div className="flex-1 overflow-y-auto p-4 anim-bounce-in">{children}</div>
      </div>
    )
  }
  return (
    <div className="modal-overlay p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal-panel flex-col ${wide ? 'w-full max-w-4xl' : 'w-full max-w-2xl'}`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <span className="font-semibold text-[13px] tracking-tight" style={{ color: 'var(--win-text)' }}>{title}</span>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{ background: 'transparent', color: 'var(--win-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--win-surface-3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="0" y1="0" x2="9" y2="9" />
              <line x1="9" y1="0" x2="0" y2="9" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
