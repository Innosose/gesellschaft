import React, { useEffect, useRef, useState } from 'react'
import { Modal } from './SearchModal'

interface TranslateModalProps {
  onClose: () => void
  asPanel?: boolean
}

interface TranslateHistoryEntry {
  from: string
  to: string
  source: string
  result: string
  ts: number
}

const LANGUAGES = ['자동 감지', '한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어', '독일어', '러시아어', '아랍어', '포르투갈어', '이탈리아어']
const TARGET_LANGUAGES = LANGUAGES.filter(l => l !== '자동 감지')
const HISTORY_KEY = 'gesellschaft-translate-history'

function loadHistory(): TranslateHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

export default function TranslateModal({ onClose, asPanel }: TranslateModalProps): React.ReactElement {
  const [sourceLang, setSourceLang] = useState('자동 감지')
  const [targetLang, setTargetLang] = useState('영어')
  const [sourceText, setSourceText] = useState('')
  const [resultText, setResultText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<TranslateHistoryEntry[]>(loadHistory)
  const streamRef = useRef('')
  const sourceLangRef = useRef(sourceLang)
  const targetLangRef = useRef(targetLang)
  const sourceTextRef = useRef(sourceText)

  // Register streaming listeners
  useEffect(() => {
    const offChunk = window.api.ai.onChunk(text => {
      streamRef.current += text
      setResultText(streamRef.current)
    })
    const offDone = window.api.ai.onDone(() => {
      const result = streamRef.current
      if (result.trim()) {
        const entry: TranslateHistoryEntry = { from: sourceLangRef.current, to: targetLangRef.current, source: sourceTextRef.current, result, ts: Date.now() }
        const updated = [entry, ...loadHistory()].slice(0, 20)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
        setHistory(updated)
      }
      setTranslating(false)
      streamRef.current = ''
    })
    const offError = window.api.ai.onError(msg => {
      setTranslating(false)
      setResultText(`⚠️ 오류: ${msg}\n\nAI 연결 설정을 확인해주세요.`)
      streamRef.current = ''
    })
    return () => { offChunk(); offDone(); offError() }
  }, [])

  const handleTranslate = async (): Promise<void> => {
    if (!sourceText.trim() || translating) return
    sourceLangRef.current = sourceLang
    targetLangRef.current = targetLang
    sourceTextRef.current = sourceText
    setTranslating(true)
    setResultText('')
    streamRef.current = ''

    const from = sourceLang === '자동 감지' ? '(자동 감지)' : sourceLang
    const prompt = `다음 텍스트를 ${from}에서 ${targetLang}로 번역해줘. 번역문만 출력하고 설명은 하지 마:\n\n${sourceText}`
    await window.api.ai.chat([{ role: 'user', content: prompt }])
  }

  const handleSwap = (): void => {
    if (sourceLang === '자동 감지') return
    const prevSource = sourceLang
    const prevTarget = targetLang
    setSourceLang(prevTarget)
    setTargetLang(prevSource)
    setSourceText(resultText)
    setResultText(sourceText)
  }

  const handleCopy = async (): Promise<void> => {
    if (!resultText) return
    await navigator.clipboard.writeText(resultText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCancel = (): void => {
    window.api.ai.cancel()
    setTranslating(false)
  }

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <Modal title="번역기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

        {/* Language bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={selectStyle}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <button
            onClick={handleSwap}
            disabled={sourceLang === '자동 감지'}
            title="언어 교환"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: sourceLang === '자동 감지' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
              cursor: sourceLang === '자동 감지' ? 'not-allowed' : 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >⇄</button>

          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={selectStyle}>
            {TARGET_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <div style={{ flex: 1 }} />

          {translating ? (
            <button
              onClick={handleCancel}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.9)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >⏹ 중지</button>
          ) : (
            <button
              onClick={handleTranslate}
              disabled={!sourceText.trim()}
              style={{
                padding: '6px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: sourceText.trim() ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(41,128,185,0.5)',
                background: sourceText.trim() ? 'rgba(41,128,185,0.2)' : 'rgba(255,255,255,0.04)',
                color: sourceText.trim() ? 'rgba(96,165,250,0.95)' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.15s ease',
              }}
            >번역</button>
          )}
          <button
            onClick={() => setShowHistory(h => !h)}
            title="번역 기록"
            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${showHistory ? 'rgba(41,128,185,0.5)' : 'rgba(255,255,255,0.1)'}`, background: showHistory ? 'rgba(41,128,185,0.15)' : 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}
          >📋</button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '8px 0', maxHeight: 180, overflowY: 'auto', flexShrink: 0 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '16px 0' }}>번역 기록이 없습니다</div>
            ) : history.map((h, i) => (
              <div
                key={i}
                style={{ padding: '7px 14px', borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                onClick={() => { setSourceLang(h.from === '(자동 감지)' ? '자동 감지' : h.from); setTargetLang(h.to); setSourceText(h.source); setResultText(h.result); setShowHistory(false) }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{h.from} → {h.to}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{new Date(h.ts).toLocaleDateString('ko-KR')}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.source}</div>
                <div style={{ fontSize: 11, color: 'rgba(96,165,250,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.result}</div>
              </div>
            ))}
          </div>
        )}

        {/* Text areas */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
          {/* Source */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>원문</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{sourceText.length}자</span>
            </div>
            <textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleTranslate() }}
              placeholder={`번역할 텍스트를 입력하세요...\n(Ctrl+Enter로 번역)`}
              style={{
                flex: 1, resize: 'none', outline: 'none',
                padding: '12px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.7,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.88)',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(41,128,185,0.45)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
            />
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0, borderRadius: 1 }} />

          {/* Result */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>번역</span>
              <button
                onClick={handleCopy}
                disabled={!resultText}
                style={{
                  padding: '2px 10px', borderRadius: 6, fontSize: 11, cursor: resultText ? 'pointer' : 'not-allowed',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: copied ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.15s ease',
                }}
              >{copied ? '✓ 복사됨' : '복사'}</button>
            </div>
            <div
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.7,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(41,128,185,0.04)',
                color: 'rgba(255,255,255,0.88)',
                overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                position: 'relative',
              }}
            >
              {translating && !resultText && (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: 12 }}>번역 중...</span>
              )}
              {resultText}
              {translating && resultText && (
                <span style={{ display: 'inline-block', width: 6, height: 14, background: 'rgba(41,128,185,0.8)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.7s step-end infinite' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        option { background: #1a1630; color: #eee; }
      `}</style>
    </Modal>
  )
}
