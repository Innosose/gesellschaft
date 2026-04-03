import React, { useState, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface DiffLine { type: 'same' | 'added' | 'removed'; lineNum: number; text: string }

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  const result: DiffLine[] = []
  const max = Math.max(linesA.length, linesB.length)
  // Simple line-by-line comparison using LCS approach (simplified)
  const m = linesA.length, n = linesB.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = linesA[i - 1] === linesB[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  let i = m, j = n
  const rev: DiffLine[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      rev.push({ type: 'same', lineNum: 0, text: linesA[i - 1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rev.push({ type: 'added', lineNum: 0, text: linesB[j - 1] }); j--
    } else {
      rev.push({ type: 'removed', lineNum: 0, text: linesA[i - 1] }); i--
    }
  }
  rev.reverse()
  let num = 1
  for (const line of rev) { line.lineNum = num++; result.push(line) }
  return result
}

export default function DiffViewerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [diff, setDiff] = useState<DiffLine[] | null>(null)
  const [stats, setStats] = useState({ added: 0, removed: 0, same: 0 })

  const compare = useCallback(() => {
    const result = computeDiff(textA, textB)
    setDiff(result)
    setStats({
      added: result.filter(d => d.type === 'added').length,
      removed: result.filter(d => d.type === 'removed').length,
      same: result.filter(d => d.type === 'same').length,
    })
  }, [textA, textB])

  const colorMap = { same: 'transparent', added: 'rgba(34,197,94,0.12)', removed: rgba(T.danger, 0.12) }
  const textColorMap = { same: 'var(--win-text-sub)', added: T.success, removed: T.danger }
  const prefixMap = { same: ' ', added: '+', removed: '-' }

  return (
    <Modal title="텍스트 비교" onClose={onClose} asPanel={asPanel} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {!diff ? (
          <>
            <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 200 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>원본 텍스트 (A)</label>
                <textarea className="win-input" value={textA} onChange={e => setTextA(e.target.value)} placeholder="원본 텍스트를 입력..." style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 12, minHeight: 200 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', fontWeight: 600 }}>수정된 텍스트 (B)</label>
                <textarea className="win-input" value={textB} onChange={e => setTextB(e.target.value)} placeholder="수정된 텍스트를 입력..." style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 12, minHeight: 200 }} />
              </div>
            </div>
            <button className="win-btn-primary" onClick={compare} style={{ alignSelf: 'center', fontSize: 13, padding: '8px 32px' }}>비교하기</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="win-btn-ghost" onClick={() => setDiff(null)} style={{ fontSize: 12 }}>← 다시 입력</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.success }}>+{stats.added} 추가</span>
              <span style={{ fontSize: 11, color: T.danger }}>-{stats.removed} 삭제</span>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{stats.same} 동일</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, background: T.bg, border: '1px solid var(--win-border)', fontFamily: 'monospace', fontSize: 12 }}>
              {diff.map((line, idx) => (
                <div key={idx} style={{ display: 'flex', background: colorMap[line.type], borderBottom: `1px solid ${rgba(T.fg, 0.03)}` }}>
                  <span style={{ width: 40, textAlign: 'right', padding: '2px 8px', color: rgba(T.fg, 0.2), fontSize: 11, flexShrink: 0, userSelect: 'none' }}>{line.lineNum}</span>
                  <span style={{ width: 18, textAlign: 'center', color: textColorMap[line.type], fontWeight: 700, flexShrink: 0, userSelect: 'none' }}>{prefixMap[line.type]}</span>
                  <span style={{ flex: 1, padding: '2px 4px', color: textColorMap[line.type], whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.text}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
