import React, { useState } from 'react'
import { Modal } from './SearchModal'
import { formatSize } from '../utils/format'

interface TypeStat {
  ext: string
  count: number
  size: number
  percent: number
  color: string
}

const EXT_COLORS: Record<string, string> = {
  image: '#4e9af1',
  video: '#e86c5d',
  audio: '#5dd88a',
  document: '#f4c430',
  code: '#c792ea',
  archive: '#ff8c00',
  other: '#888888'
}

function categorize(ext: string): string {
  const images = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.raw']
  const video = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
  const audio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']
  const docs = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.rtf']
  const code = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.html', '.css', '.json', '.xml', '.yml']
  const archive = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']

  if (images.includes(ext)) return 'image'
  if (video.includes(ext)) return 'video'
  if (audio.includes(ext)) return 'audio'
  if (docs.includes(ext)) return 'document'
  if (code.includes(ext)) return 'code'
  if (archive.includes(ext)) return 'archive'
  return 'other'
}

export default function DiskAnalysisModal({ onClose, initialFolder }: { onClose: () => void; initialFolder?: string }): React.ReactElement {
  const [scanPath, setScanPath] = useState(initialFolder || 'C:\\')
  const [scanning, setScanning] = useState(false)
  const [typeStats, setTypeStats] = useState<TypeStat[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [folderSize, setFolderSize] = useState(0)

  const scan = async (): Promise<void> => {
    setScanning(true)
    setTypeStats([])

    const [sizeRes, statsRes] = await Promise.all([
      window.api.fs.folderSize(scanPath),
      window.api.fs.typeStats(scanPath)
    ])

    setScanning(false)

    if (sizeRes.success) setFolderSize(sizeRes.size)

    if (statsRes.success) {
      // Merge by category
      const catMap: Record<string, { count: number; size: number }> = {}
      for (const [ext, stat] of Object.entries(statsRes.data as Record<string, { count: number; size: number }>)) {
        const cat = categorize(ext)
        if (!catMap[cat]) catMap[cat] = { count: 0, size: 0 }
        catMap[cat].count += stat.count
        catMap[cat].size += stat.size
      }

      const total = Object.values(catMap).reduce((sum, v) => sum + v.size, 0)
      setTotalSize(total)

      const stats: TypeStat[] = Object.entries(catMap)
        .map(([cat, v]) => ({
          ext: cat,
          count: v.count,
          size: v.size,
          percent: total > 0 ? (v.size / total) * 100 : 0,
          color: EXT_COLORS[cat] || '#888'
        }))
        .sort((a, b) => b.size - a.size)

      setTypeStats(stats)
    }
  }

  // suppress unused variable warning
  void totalSize

  const LABELS: Record<string, string> = {
    image: '이미지',
    video: '동영상',
    audio: '음악',
    document: '문서',
    code: '코드',
    archive: '압축 파일',
    other: '기타'
  }

  return (
    <Modal title="디스크 분석" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Scan path */}
        <div className="flex gap-2">
          <input
            className="win-input flex-1 text-sm"
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
          />
          <button
            className="win-btn-secondary text-sm"
            onClick={async () => {
              const dir = await window.api.dialog.openDirectory()
              if (dir) setScanPath(dir)
            }}
          >
            찾기
          </button>
          <button
            className="win-btn-primary text-sm"
            onClick={scan}
            disabled={scanning}
          >
            {scanning ? '분석 중...' : '📊 분석'}
          </button>
        </div>

        {/* Summary */}
        {folderSize > 0 && (
          <div className="rounded-lg p-3 text-center" style={{ background: 'var(--win-bg)' }}>
            <div className="text-2xl font-bold text-[#0078d4]">{formatSize(folderSize)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--win-text-muted)' }}>전체 폴더 크기</div>
          </div>
        )}

        {/* Donut chart (CSS) */}
        {typeStats.length > 0 && (
          <div>
            {/* Bar chart */}
            <div className="h-8 rounded-lg overflow-hidden flex mb-3">
              {typeStats.map((s) => (
                <div
                  key={s.ext}
                  style={{ width: `${s.percent}%`, backgroundColor: s.color }}
                  title={`${LABELS[s.ext] || s.ext}: ${s.percent.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Legend + stats */}
            <div className="space-y-2">
              {typeStats.map((s) => (
                <div key={s.ext} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="text-sm w-20 flex-shrink-0">{LABELS[s.ext] || s.ext}</div>
                  <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'var(--win-bg)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.percent}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <div className="text-xs w-12 text-right" style={{ color: 'var(--win-text-muted)' }}>{s.percent.toFixed(1)}%</div>
                  <div className="text-xs w-20 text-right" style={{ color: 'var(--win-text)' }}>{formatSize(s.size)}</div>
                  <div className="text-xs w-16 text-right" style={{ color: 'var(--win-text-muted)' }}>{s.count.toLocaleString()}개</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!scanning && typeStats.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--win-text-muted)' }}>
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm">분석 버튼을 눌러 폴더 사용량을 확인하세요.</div>
          </div>
        )}
      </div>
    </Modal>
  )
}
