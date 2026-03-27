import React, { useState } from 'react'
import { Modal } from './SearchModal'

type Tool = {
  label: string
  fn: (text: string) => string
}

const TOOLS: Tool[] = [
  { label: '앞뒤 공백 제거', fn: t => t.split('\n').map(l => l.trim()).join('\n') },
  { label: '빈 줄 제거', fn: t => t.split('\n').filter(l => l.trim()).join('\n') },
  { label: '중복 줄 제거', fn: t => [...new Set(t.split('\n'))].join('\n') },
  { label: '줄 정렬 (오름차순)', fn: t => t.split('\n').sort((a, b) => a.localeCompare(b, 'ko')).join('\n') },
  { label: '줄 정렬 (내림차순)', fn: t => t.split('\n').sort((a, b) => b.localeCompare(a, 'ko')).join('\n') },
  { label: '번호 추가', fn: t => t.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') },
  { label: '번호 제거', fn: t => t.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '')).join('\n') },
  { label: '대문자 변환', fn: t => t.toUpperCase() },
  { label: '소문자 변환', fn: t => t.toLowerCase() },
  { label: '탭 → 공백 4개', fn: t => t.replace(/\t/g, '    ') },
  { label: '연속 공백 정리', fn: t => t.split('\n').map(l => l.replace(/  +/g, ' ')).join('\n') },
  { label: '줄 역순', fn: t => t.split('\n').reverse().join('\n') },
]

function stats(text: string): string {
  const lines = text.split('\n').length
  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return `${lines}줄  /  ${chars}자  /  ${words}단어`
}

export default function TextToolsModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [lastTool, setLastTool] = useState('')

  const apply = (tool: Tool): void => {
    setOutput(tool.fn(input || output))
    setLastTool(tool.label)
    setCopied(false)
  }

  const copyOutput = async (): Promise<void> => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const swap = (): void => {
    setInput(output)
    setOutput('')
    setLastTool('')
  }

  return (
    <Modal title="텍스트 도구" onClose={onClose} asPanel={asPanel}>
      <div className="flex gap-3 h-[380px]">
        {/* 도구 버튼 */}
        <div className="w-44 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] px-1 mb-1" style={{ color: 'var(--win-text-muted)' }}>변환 도구 (입력 또는 출력에 적용)</div>
          {TOOLS.map(tool => (
            <button
              key={tool.label}
              className="text-left text-xs px-2.5 py-1.5 rounded border transition-colors"
              style={lastTool === tool.label
                ? { borderColor: 'var(--win-accent)', background: 'var(--win-accent-dim)', color: '#60a0ff' }
                : { borderColor: 'var(--win-surface-2)', color: 'var(--win-text-muted)' }
              }
              onMouseEnter={(e) => { if (lastTool !== tool.label) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--win-border)' } }}
              onMouseLeave={(e) => { if (lastTool !== tool.label) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--win-surface-2)' } }}
              onClick={() => apply(tool)}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {/* 텍스트 영역 */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>입력</span>
              <span className="text-[10px] ml-auto" style={{ color: 'var(--win-border)' }}>{input ? stats(input) : ''}</span>
            </div>
            <textarea
              className="flex-1 win-input resize-none text-xs leading-relaxed font-mono"
              value={input}
              onChange={e => { setInput(e.target.value); setOutput(''); setLastTool('') }}
              placeholder="변환할 텍스트를 입력하거나 붙여넣기..."
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              className="text-[10px] px-1"
              style={{ color: 'var(--win-text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-sub)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
              onClick={swap}
              disabled={!output}
              title="출력을 입력으로"
            >
              ↕ 출력 → 입력
            </button>
            <button
              className="text-[10px] px-1"
              style={{ color: 'var(--win-text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-sub)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--win-text-muted)' }}
              onClick={() => { setInput(''); setOutput(''); setLastTool('') }}
              disabled={!input && !output}
            >
              초기화
            </button>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--win-text-muted)' }}>출력</span>
              {lastTool && <span className="text-[10px]" style={{ color: 'var(--win-border)' }}>— {lastTool}</span>}
              <span className="text-[10px] ml-auto" style={{ color: 'var(--win-border)' }}>{output ? stats(output) : ''}</span>
            </div>
            <textarea
              className="flex-1 win-input resize-none text-xs leading-relaxed font-mono"
              value={output}
              onChange={e => setOutput(e.target.value)}
              placeholder="변환 결과가 여기에 표시됩니다..."
            />
          </div>

          <button
            className={`win-btn-primary text-xs transition-all ${copied ? 'bg-[#1e7e34]' : ''}`}
            onClick={copyOutput}
            disabled={!output}
          >
            {copied ? '✓ 복사됨' : '출력 복사'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
