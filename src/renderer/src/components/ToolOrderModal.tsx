import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

const STORAGE_KEY = 'gs-tool-order'

const DEFAULT_TOOLS = [
  { id: 'calculator', name: '계산기', icon: '🧮' },
  { id: 'flashcard', name: '단어장', icon: '📇' },
  { id: 'timetable', name: '시간표', icon: '📅' },
  { id: 'grade', name: '성적 계산기', icon: '📊' },
  { id: 'wrongnote', name: '오답노트', icon: '📝' },
  { id: 'studylog', name: '학습일지', icon: '📔' },
  { id: 'todo', name: '할 일', icon: '✅' },
  { id: 'reminders', name: '리마인더', icon: '⏰' },
  { id: 'texttools', name: '텍스트 도구', icon: '🔤' },
  { id: 'randompick', name: '랜덤 뽑기', icon: '🎲' },
  { id: 'salary', name: '급여 계산기', icon: '💰' },
  { id: 'pdf', name: 'PDF 도구', icon: '📄' },
  { id: 'excel', name: '엑셀 도구', icon: '📗' },
  { id: 'ocr', name: 'OCR', icon: '👁️' },
  { id: 'pomodoro', name: '뽀모도로', icon: '🍅' },
  { id: 'markdown', name: '마크다운', icon: '📝' },
  { id: 'codesnippet', name: '코드 스니펫', icon: '💻' },
  { id: 'diff', name: '텍스트 비교', icon: '🔍' },
  { id: 'encrypt', name: '암호화', icon: '🔐' },
  { id: 'unitconv', name: '단위 변환', icon: '📐' },
  { id: 'worldclock', name: '세계 시계', icon: '🌍' },
  { id: 'countdown', name: '카운트다운', icon: '⏳' },
  { id: 'whitenoise', name: '백색소음', icon: '🔊' },
  { id: 'contact', name: '명함 관리', icon: '👤' },
  { id: 'studygroup', name: '스터디 그룹', icon: '👥' },
  { id: 'wishlist', name: '위시리스트', icon: '🎁' },
  { id: 'quickshare', name: '빠른 공유', icon: '📤' },
  { id: 'theme', name: '테마 프리셋', icon: '🎨' },
  { id: 'widget', name: '위젯 보드', icon: '📋' },
  { id: 'motivation', name: '동기부여', icon: '💪' },
]

interface ToolItem { id: string; name: string; icon: string; visible: boolean }

function load(): ToolItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TOOLS.map(t => ({ ...t, visible: true }))
    const saved = JSON.parse(raw) as ToolItem[]
    // Merge with defaults to include any new tools
    const savedIds = new Set(saved.map(t => t.id))
    const merged = [...saved]
    DEFAULT_TOOLS.forEach(t => { if (!savedIds.has(t.id)) merged.push({ ...t, visible: true }) })
    return merged
  } catch { return DEFAULT_TOOLS.map(t => ({ ...t, visible: true })) }
}

export default function ToolOrderModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tools, setTools] = useState<ToolItem[]>(load)
  const [saved, setSaved] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(tools)) }, [tools])

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return
    setTools(prev => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n })
  }, [])

  const moveDown = useCallback((idx: number) => {
    setTools(prev => {
      if (idx >= prev.length - 1) return prev
      const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n
    })
  }, [])

  const toggleVisibility = useCallback((idx: number) => {
    setTools(prev => prev.map((t, i) => i === idx ? { ...t, visible: !t.visible } : t))
  }, [])

  const reset = useCallback(() => {
    setTools(DEFAULT_TOOLS.map(t => ({ ...t, visible: true })))
  }, [])

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools))
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }, [tools])

  return (
    <Modal title="도구 순서" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--win-text-muted)', flex: 1 }}>도구를 원하는 순서로 정렬하세요</div>
          <button className="win-btn-ghost" onClick={reset} style={{ fontSize: 11 }}>초기화</button>
          <button className="win-btn-primary" onClick={save} style={{ fontSize: 12 }}>{saved ? '저장됨!' : '저장'}</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tools.map((tool, idx) => (
            <div key={tool.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)',
              opacity: tool.visible ? 1 : 0.4,
            }}>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)', width: 20, textAlign: 'right' }}>{idx + 1}</span>
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{tool.name}</span>
              <button onClick={() => toggleVisibility(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: tool.visible ? T.success : 'var(--win-text-muted)' }}>
                {tool.visible ? '●' : '○'}
              </button>
              <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 14, color: idx === 0 ? 'var(--win-border)' : 'var(--win-text-muted)' }}>▲</button>
              <button onClick={() => moveDown(idx)} disabled={idx === tools.length - 1} style={{ background: 'none', border: 'none', cursor: idx === tools.length - 1 ? 'default' : 'pointer', fontSize: 14, color: idx === tools.length - 1 ? 'var(--win-border)' : 'var(--win-text-muted)' }}>▼</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
