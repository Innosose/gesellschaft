import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T } from '../utils/theme'

function countBytes(str: string): number {
  return new TextEncoder().encode(str).length
}

export default function CharCounterModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const chars = text.length
    const charsNoSpace = text.replace(/\s/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const sentences = text.trim() ? (text.match(/[.!?。!?]+/g) || []).length || (text.trim() ? 1 : 0) : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0) : 0
    const lines = text ? text.split('\n').length : 0
    const bytes = countBytes(text)
    const korean = (text.match(/[\uAC00-\uD7AF\u3130-\u318F\u1100-\u11FF]/g) || []).length
    return { chars, charsNoSpace, words, sentences, paragraphs, lines, bytes, korean }
  }, [text])

  const copyStats = () => {
    const t = [
      `글자 수: ${stats.chars}`, `공백 제외: ${stats.charsNoSpace}`, `단어 수: ${stats.words}`,
      `문장 수: ${stats.sentences}`, `문단 수: ${stats.paragraphs}`, `줄 수: ${stats.lines}`,
      `한글: ${stats.korean}`, `바이트 (UTF-8): ${stats.bytes}`,
    ].join('\n')
    navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }

  const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
    <div style={{
      padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)',
      textAlign: 'center', flex: '1 1 100px',
    }}>
      <div style={{ fontSize: accent ? 24 : 20, fontWeight: 700, color: accent ? T.teal : 'var(--win-text)', fontFamily: 'monospace' }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <Modal title="글자 수 세기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* stats grid */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatCard label="글자 수" value={stats.chars} accent />
          <StatCard label="공백 제외" value={stats.charsNoSpace} accent />
          <StatCard label="단어 수" value={stats.words} />
          <StatCard label="문장 수" value={stats.sentences} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatCard label="문단 수" value={stats.paragraphs} />
          <StatCard label="줄 수" value={stats.lines} />
          <StatCard label="한글" value={stats.korean} />
          <StatCard label="바이트 (UTF-8)" value={stats.bytes} />
        </div>

        {/* textarea */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>텍스트 입력</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="win-btn-ghost" onClick={copyStats} style={{ fontSize: 11 }}>{copied ? '복사됨!' : '통계 복사'}</button>
              <button className="win-btn-ghost" onClick={() => setText('')} style={{ fontSize: 11 }}>지우기</button>
            </div>
          </div>
          <textarea
            className="win-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="여기에 텍스트를 입력하거나 붙여넣기 하세요..."
            style={{ flex: 1, resize: 'none', fontSize: 14, lineHeight: 1.6 }}
          />
        </div>

        {/* reading estimate */}
        {stats.words > 0 && (
          <div style={{ fontSize: 11, color: 'var(--win-text-muted)', textAlign: 'right' }}>
            예상 읽기 시간: ~{Math.max(1, Math.ceil(stats.words / 200))}분 (200 단어/분 기준)
          </div>
        )}
      </div>
    </Modal>
  )
}
