import React, { useState } from 'react'
import { Modal } from './SearchModal'
import { formatSize, formatDate } from '../utils/format'

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
  only_a:  { label: 'A만 존재', bg: 'bg-[#3b82f620]', text: 'text-[#3b82f6]', dot: '#3b82f6' },
  only_b:  { label: 'B만 존재', bg: 'bg-[#22c55e20]', text: 'text-[#22c55e]', dot: '#22c55e' },
  modified:{ label: '내용 다름', bg: 'bg-[#f9731620]', text: 'text-[#f97316]', dot: '#f97316' },
  same:    { label: '동일',     bg: '',                text: '',               dot: 'var(--win-text-muted)' }
}

export default function FolderCompareModal({
  onClose,
  initialFolder,
  asPanel
}: {
  onClose: () => void
  initialFolder?: string
  asPanel?: boolean
}): React.ReactElement {
  const [pathA, setPathA] = useState(initialFolder || '')
  const [pathB, setPathB] = useState('')
  const [comparing, setComparing] = useState(false)
  const [results, setResults] = useState<CompareEntry[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [hideSame, setHideSame] = useState(true)

  const compare = async (): Promise<void> => {
    if (!pathA || !pathB) return
    setComparing(true)
    setResults([])
    const res = await window.api.folderCompare.compare(pathA, pathB)
    if (res.success && res.data) setResults(res.data)
    setComparing(false)
  }

  const counts = {
    only_a:  results.filter((r) => r.status === 'only_a').length,
    only_b:  results.filter((r) => r.status === 'only_b').length,
    modified: results.filter((r) => r.status === 'modified').length,
    same:    results.filter((r) => r.status === 'same').length
  }

  const filtered = results.filter((r) => {
    if (hideSame && r.status === 'same') return false
    if (filter === 'all') return true
    return r.status === filter
  })

  return (
    <Modal title="폴더 비교" onClose={onClose} wide asPanel={asPanel}>
      <div className="space-y-3">
        {/* 폴더 A */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--win-text-muted)' }}>폴더 A (기준)</label>
            <div className="flex gap-1">
              <input
                className="win-input flex-1 text-xs"
                value={pathA}
                onChange={(e) => setPathA(e.target.value)}
                placeholder="기준 폴더 경로"
              />
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
              <input
                className="win-input flex-1 text-xs"
                value={pathB}
                onChange={(e) => setPathB(e.target.value)}
                placeholder="비교할 폴더 경로"
              />
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

        {/* 요약 */}
        {results.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(['only_a', 'only_b', 'modified', 'same'] as const).map((s) => (
                <button
                  key={s}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    filter === s
                      ? 'border-[#0078d4] bg-[#0078d420]'
                      : ''
                  }`}
                  style={filter !== s ? { borderColor: 'var(--win-border)' } : undefined}
                  onClick={() => setFilter(filter === s ? 'all' : s)}
                >
                  <div
                    className="text-xl font-bold"
                    style={{ color: STATUS_STYLE[s].dot }}
                  >
                    {counts[s]}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--win-text-muted)' }}>{STATUS_STYLE[s].label}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--win-text-muted)' }}>전체 {results.length}개 파일</span>
              <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--win-text-muted)' }}>
                <input
                  type="checkbox"
                  checked={hideSame}
                  onChange={(e) => setHideSame(e.target.checked)}
                  className="accent-[#0078d4]"
                />
                동일 파일 숨기기
              </label>
            </div>

            {/* 파일 목록 */}
            <div className="rounded overflow-hidden" style={{ border: '1px solid var(--win-border)' }}>
              {/* 헤더 */}
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
                      <span className={`truncate ${s.text}`} title={entry.relativePath}>
                        {entry.relativePath}
                      </span>
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
    </Modal>
  )
}
