import React from 'react'
import { Modal } from './SearchModal'

interface KorEngModalProps {
  onClose: () => void
  asPanel?: boolean
}

// 한글 자모 → 영문 키 매핑 (QWERTY 기준)
const KOR_TO_ENG: Record<string, string> = {
  'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't',
  'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
  'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g',
  'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
  'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm',
  // 쌍자음
  'ㅃ': 'Q', 'ㅉ': 'W', 'ㄸ': 'E', 'ㄲ': 'R', 'ㅆ': 'T',
  // 이중모음
  'ㅒ': 'O', 'ㅖ': 'P',
}

const ENG_TO_KOR: Record<string, string> = Object.fromEntries(
  Object.entries(KOR_TO_ENG).map(([k, v]) => [v, k])
)

// 유니코드 한글 완성자 분해 (초성, 중성, 종성)
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function decomposeHangul(char: string): string[] {
  const code = char.charCodeAt(0) - 0xAC00
  if (code < 0 || code > 11171) return [char]
  const cho = Math.floor(code / 21 / 28)
  const jung = Math.floor((code % (21 * 28)) / 28)
  const jong = code % 28
  const result = [CHOSUNG[cho], JUNGSUNG[jung]]
  if (jong > 0) result.push(JONGSUNG[jong])
  return result
}

function convertKorToEng(text: string): string {
  let result = ''
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      // 완성형 한글 → 자모 분해 → 영문
      const jamos = decomposeHangul(char)
      for (const j of jamos) {
        result += KOR_TO_ENG[j] || j
      }
    } else if (KOR_TO_ENG[char]) {
      // 자모 직접
      result += KOR_TO_ENG[char]
    } else {
      result += char
    }
  }
  return result
}

function convertEngToKor(text: string): string {
  let result = ''
  for (const char of text) {
    if (ENG_TO_KOR[char]) {
      result += ENG_TO_KOR[char]
    } else {
      result += char
    }
  }
  return result
}

export default function KorEngModal({ onClose, asPanel }: KorEngModalProps): React.ReactElement {
  const [input, setInput] = React.useState('')
  const [output, setOutput] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const handleKorToEng = (): void => {
    setOutput(convertKorToEng(input))
  }

  const handleEngToKor = (): void => {
    setOutput(convertEngToKor(input))
  }

  const handleSwap = (): void => {
    setInput(output)
    setOutput(input)
  }

  const handleCopy = async (): Promise<void> => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal title="한↔영 오타 변환" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 설명 */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--win-surface-2)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--win-text-muted)',
            border: '1px solid var(--win-border)',
          }}
        >
          ⌨️ 한글/영문 키보드를 잘못 눌러 오타가 발생했을 때 변환합니다.
          예: <strong style={{ color: 'var(--win-text-sub)' }}>안녕하세요</strong> → <strong style={{ color: 'var(--win-text-sub)' }}>dkssudgktpdy</strong> (한→영)
        </div>

        {/* 텍스트 영역 */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>입력 텍스트</label>
            <textarea
              className="win-textarea"
              style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 14 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="변환할 텍스트를 입력하세요..."
            />
          </div>

          {/* 가운데 버튼들 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', flexShrink: 0 }}>
            <button
              className="win-btn-primary"
              style={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap', padding: '8px 12px', fontSize: 12 }}
              onClick={handleKorToEng}
            >
              한→영
            </button>
            <button
              className="win-btn-primary"
              style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: 12 }}
              onClick={handleEngToKor}
            >
              영→한
            </button>
            <button
              className="win-btn-ghost"
              style={{ padding: '8px 12px', fontSize: 16 }}
              onClick={handleSwap}
              title="입력/출력 교환"
            >
              ⇄
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>변환 결과</label>
              <button
                className="win-btn-ghost"
                style={{ padding: '2px 10px', fontSize: 12 }}
                onClick={handleCopy}
              >
                {copied ? '✅ 복사됨' : '복사'}
              </button>
            </div>
            <textarea
              className="win-textarea"
              style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 14 }}
              value={output}
              onChange={e => setOutput(e.target.value)}
              placeholder="변환 결과가 여기에 표시됩니다..."
            />
          </div>
        </div>

        {/* 매핑 테이블 */}
        <details>
          <summary style={{ fontSize: 12, color: 'var(--win-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            키보드 매핑 보기
          </summary>
          <div
            style={{
              marginTop: 8,
              padding: 10,
              background: 'var(--win-surface-2)',
              borderRadius: 6,
              border: '1px solid var(--win-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {Object.entries(KOR_TO_ENG).slice(0, 27).map(([k, v]) => (
              <span
                key={k}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 8px',
                  background: 'var(--win-surface-3)',
                  borderRadius: 4,
                  fontSize: 11,
                  color: 'var(--win-text-sub)',
                }}
              >
                <span style={{ color: 'var(--win-accent)' }}>{k}</span>
                <span style={{ color: 'var(--win-text-muted)' }}>→</span>
                <span>{v}</span>
              </span>
            ))}
          </div>
        </details>
      </div>
    </Modal>
  )
}
