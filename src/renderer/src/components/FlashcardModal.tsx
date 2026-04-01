import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Card {
  id: number
  front: string
  back: string
}

const STORAGE_KEY = 'gesellschaft-flashcards'
let nextId = 1

function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const cards = JSON.parse(raw) as Card[]
    nextId = Math.max(...cards.map(c => c.id), 0) + 1
    return cards
  } catch { return [] }
}

function saveCards(cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

type Tab = 'list' | 'quiz'

export default function FlashcardModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<Tab>('list')
  const [cards, setCards] = useState<Card[]>(loadCards)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')

  // 퀴즈 상태
  const [quizIdx, setQuizIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quizOrder, setQuizOrder] = useState<number[]>([])
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  useEffect(() => { saveCards(cards) }, [cards])

  const addCard = useCallback(() => {
    if (!front.trim() || !back.trim()) return
    setCards(prev => [...prev, { id: nextId++, front: front.trim(), back: back.trim() }])
    setFront('')
    setBack('')
  }, [front, back])

  const removeCard = useCallback((id: number) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  const startQuiz = useCallback(() => {
    if (cards.length === 0) return
    const order = cards.map((_, i) => i).sort(() => Math.random() - 0.5)
    setQuizOrder(order)
    setQuizIdx(0)
    setFlipped(false)
    setScore({ correct: 0, wrong: 0 })
    setTab('quiz')
  }, [cards])

  const quizCard = useMemo(() => {
    if (quizOrder.length === 0) return null
    return cards[quizOrder[quizIdx]] ?? null
  }, [cards, quizOrder, quizIdx])

  const handleAnswer = useCallback((correct: boolean) => {
    setScore(prev => correct ? { ...prev, correct: prev.correct + 1 } : { ...prev, wrong: prev.wrong + 1 })
    setFlipped(false)
    setQuizIdx(prev => prev + 1)
  }, [])

  const quizDone = quizIdx >= quizOrder.length

  return (
    <Modal title="단어장" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'list' as Tab, label: `카드 목록 (${cards.length})` },
            { id: 'quiz' as Tab, label: '퀴즈 모드' },
          ]).map(t => (
            <button key={t.id} onClick={() => t.id === 'quiz' ? startQuiz() : setTab('list')} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45), transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'list' && (
          <>
            {/* 입력 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 2, display: 'block' }}>앞면 (질문/단어)</label>
                <input className="win-input" value={front} onChange={e => setFront(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCard()} placeholder="영어 단어, 용어..." style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 2, display: 'block' }}>뒷면 (답/뜻)</label>
                <input className="win-input" value={back} onChange={e => setBack(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCard()} placeholder="뜻, 설명..." style={{ width: '100%' }} />
              </div>
              <button className="win-btn-primary" onClick={addCard} style={{ height: 34 }}>추가</button>
            </div>
            {/* 카드 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cards.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>카드를 추가하세요</div>
              )}
              {cards.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{c.front}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--win-text-sub)' }}>{c.back}</span>
                  <button className="win-btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => removeCard(c.id)}>삭제</button>
                </div>
              ))}
            </div>
            <button className="win-btn-primary" onClick={startQuiz} disabled={cards.length === 0} style={{ alignSelf: 'flex-start' }}>
              퀴즈 시작 ({cards.length}장)
            </button>
          </>
        )}

        {tab === 'quiz' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {quizDone ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-text)', marginBottom: 8 }}>퀴즈 완료!</div>
                <div style={{ fontSize: 14, color: 'var(--win-text-sub)', marginBottom: 20 }}>
                  맞음 <span style={{ color: 'var(--win-success)', fontWeight: 700 }}>{score.correct}</span> / 틀림 <span style={{ color: 'var(--win-danger)', fontWeight: 700 }}>{score.wrong}</span> / 총 {quizOrder.length}장
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="win-btn-primary" onClick={startQuiz}>다시 하기</button>
                  <button className="win-btn-secondary" onClick={() => setTab('list')}>목록으로</button>
                </div>
              </div>
            ) : quizCard && (
              <>
                <div style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>{quizIdx + 1} / {quizOrder.length}</div>
                <div
                  onClick={() => setFlipped(!flipped)}
                  style={{
                    width: 320, minHeight: 180, padding: 24, borderRadius: 16, cursor: 'pointer',
                    background: flipped ? `linear-gradient(135deg, ${rgba(T.success, 0.15)}, ${rgba(T.success, 0.05)})` : 'var(--win-surface-2)',
                    border: `2px solid ${flipped ? rgba(T.success, 0.4) : 'var(--win-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginBottom: 8 }}>{flipped ? '뒷면 (답)' : '앞면 (질문)'}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win-text)', wordBreak: 'keep-all' }}>
                      {flipped ? quizCard.back : quizCard.front}
                    </div>
                    {!flipped && <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginTop: 12 }}>클릭하여 정답 확인</div>}
                  </div>
                </div>
                {flipped && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="win-btn-primary" style={{ background: 'var(--win-success)' }} onClick={() => handleAnswer(true)}>맞았어요</button>
                    <button className="win-btn-danger" onClick={() => handleAnswer(false)}>틀렸어요</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
