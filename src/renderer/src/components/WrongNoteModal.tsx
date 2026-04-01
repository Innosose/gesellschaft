import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface WrongNote {
  id: number
  subject: string
  question: string
  myAnswer: string
  correct: string
  explanation: string
  createdAt: string
  reviewCount: number
  starred: boolean
}

const STORAGE_KEY = 'gesellschaft-wrong-notes'
const SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '한국사', '기타'] as const
let nextId = 1

function loadNotes(): WrongNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const notes = JSON.parse(raw) as WrongNote[]
    nextId = Math.max(...notes.map(n => n.id), 0) + 1
    return notes
  } catch { return [] }
}

type Tab = 'list' | 'add' | 'review'

export default function WrongNoteModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [notes, setNotes] = useState<WrongNote[]>(loadNotes)
  const [tab, setTab] = useState<Tab>('list')
  const [filterSubject, setFilterSubject] = useState<string>('전체')

  // 입력 상태
  const [subject, setSubject] = useState<string>('수학')
  const [question, setQuestion] = useState('')
  const [myAnswer, setMyAnswer] = useState('')
  const [correct, setCorrect] = useState('')
  const [explanation, setExplanation] = useState('')

  // 복습 상태
  const [reviewIdx, setReviewIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) }, [notes])

  const addNote = useCallback(() => {
    if (!question.trim()) return
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setNotes(prev => [{
      id: nextId++, subject, question: question.trim(),
      myAnswer: myAnswer.trim(), correct: correct.trim(),
      explanation: explanation.trim(), createdAt: dateStr,
      reviewCount: 0, starred: false,
    }, ...prev])
    setQuestion(''); setMyAnswer(''); setCorrect(''); setExplanation('')
    setTab('list')
  }, [subject, question, myAnswer, correct, explanation])

  const deleteNote = useCallback((id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  const toggleStar = useCallback((id: number) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, starred: !n.starred } : n))
  }, [])

  const filtered = useMemo(() => {
    if (filterSubject === '전체') return notes
    return notes.filter(n => n.subject === filterSubject)
  }, [notes, filterSubject])

  const reviewNotes = useMemo(() => {
    return filtered.length > 0 ? filtered.sort(() => Math.random() - 0.5) : []
  }, [filtered])

  const startReview = useCallback(() => {
    if (filtered.length === 0) return
    setReviewIdx(0)
    setShowAnswer(false)
    setTab('review')
  }, [filtered])

  const markReviewed = useCallback(() => {
    const note = reviewNotes[reviewIdx]
    if (note) {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, reviewCount: n.reviewCount + 1 } : n))
    }
    setShowAnswer(false)
    setReviewIdx(prev => prev + 1)
  }, [reviewIdx, reviewNotes])

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': notes.length }
    for (const n of notes) counts[n.subject] = (counts[n.subject] ?? 0) + 1
    return counts
  }, [notes])

  return (
    <Modal title="오답노트" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'list' as Tab, label: `오답 목록 (${notes.length})` },
            { id: 'add' as Tab, label: '+ 오답 추가' },
            { id: 'review' as Tab, label: '복습 모드' },
          ]).map(t => (
            <button key={t.id} onClick={() => t.id === 'review' ? startReview() : setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45), transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* 오답 추가 */}
        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="win-select" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 100 }}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>문제 내용 *</label>
              <textarea className="win-textarea" value={question} onChange={e => setQuestion(e.target.value)} placeholder="틀린 문제를 적어주세요..." style={{ height: 60, resize: 'none', fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>내가 쓴 답</label>
                <input className="win-input" value={myAnswer} onChange={e => setMyAnswer(e.target.value)} placeholder="내 답..." />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>정답</label>
                <input className="win-input" value={correct} onChange={e => setCorrect(e.target.value)} placeholder="정답..." />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 4 }}>풀이/해설 메모</label>
              <textarea className="win-textarea" value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="왜 틀렸는지, 풀이 과정..." style={{ height: 60, resize: 'none', fontSize: 13 }} />
            </div>
            <button className="win-btn-primary" onClick={addNote} disabled={!question.trim()}>오답 저장</button>
          </div>
        )}

        {/* 오답 목록 */}
        {tab === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['전체', ...SUBJECTS].filter(s => subjectCounts[s]).map(s => (
                <button key={s} onClick={() => setFilterSubject(s)} style={{
                  padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: filterSubject === s ? rgba(T.teal, 0.25) : rgba(T.fg, 0.06),
                  color: filterSubject === s ? T.gold : rgba(T.fg, 0.5),
                }}>{s} ({subjectCounts[s] ?? 0})</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>
                  오답이 없습니다. 틀린 문제를 기록해보세요!
                </div>
              )}
              {filtered.map(n => (
                <div key={n.id} style={{
                  padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8,
                  border: `1px solid ${n.starred ? 'rgba(251,191,36,0.4)' : 'var(--win-border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, background: 'rgba(139,92,246,0.15)', color: T.gold, fontWeight: 600 }}>{n.subject}</span>
                    <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{n.createdAt}</span>
                    <span style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>복습 {n.reviewCount}회</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button onClick={() => toggleStar(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}>{n.starred ? '⭐' : '☆'}</button>
                      <button className="win-btn-danger" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => deleteNote(n.id)}>삭제</button>
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)', marginBottom: 4 }}>{n.question}</div>
                  {(n.myAnswer || n.correct) && (
                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                      {n.myAnswer && <span style={{ color: 'var(--win-danger)' }}>내 답: {n.myAnswer}</span>}
                      {n.correct && <span style={{ color: 'var(--win-success)' }}>정답: {n.correct}</span>}
                    </div>
                  )}
                  {n.explanation && <div style={{ fontSize: 12, color: 'var(--win-text-sub)', marginTop: 4, lineHeight: 1.5 }}>{n.explanation}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 복습 모드 */}
        {tab === 'review' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            {reviewIdx >= reviewNotes.length ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-text)' }}>복습 완료!</div>
                <div style={{ fontSize: 13, color: 'var(--win-text-sub)', margin: '8px 0 20px' }}>{reviewNotes.length}문제 복습함</div>
                <button className="win-btn-primary" onClick={startReview}>다시 복습</button>
              </div>
            ) : (() => {
              const n = reviewNotes[reviewIdx]
              return (
                <>
                  <div style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>{reviewIdx + 1} / {reviewNotes.length} · {n.subject}</div>
                  <div style={{
                    width: '100%', maxWidth: 420, padding: 20, borderRadius: 14,
                    background: 'var(--win-surface-2)', border: '1px solid var(--win-border)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--win-text)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{n.question}</div>
                    {n.myAnswer && <div style={{ fontSize: 13, color: 'var(--win-danger)', marginTop: 12 }}>내가 쓴 답: {n.myAnswer}</div>}
                  </div>
                  {!showAnswer ? (
                    <button className="win-btn-primary" onClick={() => setShowAnswer(true)}>정답 보기</button>
                  ) : (
                    <div style={{
                      width: '100%', maxWidth: 420, padding: 16, borderRadius: 12,
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
                    }}>
                      {n.correct && <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--win-success)', marginBottom: 8 }}>정답: {n.correct}</div>}
                      {n.explanation && <div style={{ fontSize: 13, color: 'var(--win-text-sub)', lineHeight: 1.6 }}>{n.explanation}</div>}
                    </div>
                  )}
                  {showAnswer && <button className="win-btn-secondary" onClick={markReviewed}>다음 문제</button>}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </Modal>
  )
}
