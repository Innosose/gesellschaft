import React, { useState } from 'react'
import { Modal } from './SearchModal'

type Tool = {
  label: string
  group: string
  fn: (text: string) => string
}

const TOOLS: Tool[] = [
  // 업무 서식
  { group: '업무 서식', label: '전화번호 포맷', fn: t => t.replace(/\D/g, '').replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3') },
  { group: '업무 서식', label: '사업자번호 포맷', fn: t => t.replace(/\D/g, '').replace(/^(\d{3})(\d{2})(\d{5})$/, '$1-$2-$3') },
  { group: '업무 서식', label: '금액 콤마 표시', fn: t => { const n = parseFloat(t.replace(/[,\s]/g, '')); return isNaN(n) ? t : n.toLocaleString('ko-KR') } },
  { group: '업무 서식', label: '금액 한글 변환', fn: t => {
    const n = parseInt(t.replace(/[,\s]/g, ''))
    if (isNaN(n) || n < 0) return t
    const units = ['', '만', '억', '조']
    const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
    if (n === 0) return '영원'
    let result = ''
    let num = n
    for (let i = 3; i >= 0; i--) {
      const unit = Math.pow(10000, i)
      const v = Math.floor(num / unit)
      if (v > 0) {
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 1000) % 10] : '') + (Math.floor(v / 1000) % 10 > 0 ? '천' : '')
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 100) % 10] : '') + (Math.floor(v / 100) % 10 > 0 ? '백' : '')
        result += (v > 1 || i === 0 ? digits[Math.floor(v / 10) % 10] : '') + (Math.floor(v / 10) % 10 > 0 ? '십' : '')
        result += v % 10 > 0 ? digits[v % 10] : ''
        result += units[i]
      }
      num -= v * unit
    }
    return result + '원'
  }},
  { group: '업무 서식', label: '주민번호 마스킹', fn: t => t.replace(/(\d{6})-?(\d)\d{6}/, '$1-$2******') },
  { group: '업무 서식', label: '계좌번호 마스킹', fn: t => t.replace(/(\d{3,4})-?(\d{2,4})-?(\d{4,8})-?(\d{1,3})/, (_, a, b, c, d) => `${a}-${b}-${'*'.repeat(c.length)}-${d}`) },

  // 줄/공백 정리
  { group: '정리', label: '앞뒤 공백 제거', fn: t => t.split('\n').map(l => l.trim()).join('\n') },
  { group: '정리', label: '빈 줄 제거', fn: t => t.split('\n').filter(l => l.trim()).join('\n') },
  { group: '정리', label: '중복 줄 제거', fn: t => [...new Set(t.split('\n'))].join('\n') },
  { group: '정리', label: '연속 공백 정리', fn: t => t.split('\n').map(l => l.replace(/  +/g, ' ')).join('\n') },

  // 목록/순서
  { group: '목록', label: '번호 추가', fn: t => t.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') },
  { group: '목록', label: '번호 제거', fn: t => t.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '')).join('\n') },
  { group: '목록', label: '줄 정렬 (가나다)', fn: t => t.split('\n').sort((a, b) => a.localeCompare(b, 'ko')).join('\n') },
  { group: '목록', label: '줄 역순', fn: t => t.split('\n').reverse().join('\n') },

  // 대소문자
  { group: '대소문자', label: '대문자 변환', fn: t => t.toUpperCase() },
  { group: '대소문자', label: '소문자 변환', fn: t => t.toLowerCase() },
]

const GROUPS = [...new Set(TOOLS.map(t => t.group))]

function stats(text: string): string {
  const lines = text.split('\n').length
  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return `${lines}줄 · ${chars}자 · ${words}단어`
}

export default function TextToolsModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [lastTool, setLastTool] = useState('')

  const apply = (tool: Tool): void => {
    setOutput(tool.fn(output || input))
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
      <div className="flex gap-3 h-[400px]">
        {/* 도구 버튼 */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {GROUPS.map(group => (
            <div key={group}>
              <div className="text-[10px] px-1 mb-1.5 font-semibold tracking-wide" style={{ color: 'var(--win-text-muted)' }}>
                {group}
              </div>
              <div className="flex flex-col gap-1">
                {TOOLS.filter(t => t.group === group).map(tool => (
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
            </div>
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
              className="flex-1 win-input resize-none text-xs leading-relaxed"
              value={input}
              onChange={e => { setInput(e.target.value); setOutput(''); setLastTool('') }}
              placeholder="변환할 텍스트를 입력하거나 붙여넣기..."
            />
          </div>

          <div className="flex items-center gap-2">
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
              className="flex-1 win-input resize-none text-xs leading-relaxed"
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
