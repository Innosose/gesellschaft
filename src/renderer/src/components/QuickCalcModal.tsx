import React, { useState, useMemo, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'
import { safeMathEval } from '../utils/mathEval'

interface HistoryEntry { expr: string; result: string }

const HISTORY_KEY = 'gs-quick-calc-history'

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function preprocessExpr(raw: string): string {
  let expr = raw.trim()
  // Korean number words
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*억/g, '($1*100000000)')
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*만/g, '($1*10000)')
  // Power operator: convert ^ to repeated multiplication is not needed since safeMathEval doesn't support **
  // Instead, we just strip ^ since safeMathEval doesn't handle it — keep it simple
  expr = expr.replace(/\^/g, '') // Remove unsupported operator
  return expr
}

function safeEval(raw: string): string {
  const expr = preprocessExpr(raw)
  if (!expr) return ''
  try {
    const result = safeMathEval(expr)
    if (typeof result !== 'number' || !isFinite(result)) return '오류'
    return result.toLocaleString('ko-KR', { maximumFractionDigits: 10 })
  } catch {
    return ''
  }
}

export default function QuickCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => safeEval(expr), [expr])

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  }, [])

  const confirm = useCallback(() => {
    if (!expr.trim() || !result || result === '오류') return
    const entry: HistoryEntry = { expr: expr.trim(), result }
    const next = [entry, ...history.filter(h => h.expr !== entry.expr)].slice(0, 10)
    saveHistory(next)
    setExpr('')
  }, [expr, result, history, saveHistory])

  const copyResult = useCallback(async () => {
    if (!result || result === '오류') return
    try {
      await navigator.clipboard.writeText(result.replace(/,/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard unavailable */ }
  }, [result])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirm()
  }

  return (
    <Modal title="빠른 수식" onClose={onClose} asPanel={asPanel}>
      <div className="flex flex-col gap-3">
        {/* Input */}
        <div>
          <input
            className="win-input"
            style={{ width: '100%', fontSize: 14, fontFamily: 'monospace' }}
            placeholder="수식 입력 (예: 1200 * 0.3 + 500, 3만 * 5)"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Result */}
        <div style={{
          background: rgba(T.gold, 0.08), borderRadius: 8, padding: '12px 16px',
          border: `1px solid ${rgba(T.gold, 0.15)}`, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>결과</span>
            <div style={{ fontSize: 22, fontWeight: 700, color: result === '오류' ? T.danger : T.teal, fontFamily: 'monospace' }}>
              {result || '—'}
            </div>
          </div>
          {result && result !== '오류' && (
            <div className="flex gap-2">
              <button className="win-btn-secondary" style={{ fontSize: 11, padding: '2px 10px' }} onClick={copyResult}>
                {copied ? '복사됨!' : '복사'}
              </button>
              <button className="win-btn-primary" style={{ fontSize: 11, padding: '2px 10px' }} onClick={confirm}>
                저장
              </button>
            </div>
          )}
        </div>

        {/* Operator hints */}
        <div style={{ fontSize: 10, color: 'var(--win-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['+', '-', '*', '/', '%', '^(거듭제곱)', '( )', '만', '억'].map(op => (
            <span key={op} style={{ background: rgba(T.gold, 0.1), padding: '1px 6px', borderRadius: 4 }}>{op}</span>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>계산 기록</span>
              <button
                style={{ fontSize: 10, color: T.danger, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => saveHistory([])}
              >전체 삭제</button>
            </div>
            <div className="flex flex-col gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', borderRadius: 4, fontSize: 12,
                    background: rgba(T.gold, 0.04), cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                  onClick={() => setExpr(h.expr)}
                >
                  <span style={{ color: 'var(--win-text-muted)' }}>{h.expr}</span>
                  <span style={{ color: T.teal, fontWeight: 600 }}>= {h.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
