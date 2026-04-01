import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const QUOTES = [
  { text: '오늘 하루도 최선을 다하자.', author: '' },
  { text: '포기하지 않는 한, 실패는 없다.', author: '' },
  { text: '꿈을 꾸는 것만으로는 부족하다. 행동하라.', author: '' },
  { text: '작은 진전도 여전히 진전이다.', author: '' },
  { text: '실패는 성공의 어머니.', author: '토마스 에디슨' },
  { text: '어제의 나보다 나은 오늘의 내가 되자.', author: '' },
  { text: '천리 길도 한 걸음부터.', author: '노자' },
  { text: '할 수 있다고 믿으면 이미 반은 온 것이다.', author: '시어도어 루스벨트' },
  { text: '지금 이 순간이 네 인생에서 가장 젊은 순간이다.', author: '' },
  { text: '노력은 절대 배신하지 않는다.', author: '' },
  { text: '꾸준함이 천재를 이긴다.', author: '' },
  { text: '오늘 걷지 않으면 내일 뛰어야 한다.', author: '' },
  { text: '불가능이란 노력하지 않는 자의 변명이다.', author: '나폴레옹' },
  { text: '성공은 매일 반복한 작은 노력의 합이다.', author: '로버트 콜리어' },
  { text: '생각이 바뀌면 행동이 바뀌고, 행동이 바뀌면 인생이 바뀐다.', author: '윌리엄 제임스' },
  { text: '가장 어두운 밤도 끝나고 해는 뜬다.', author: '빅토르 위고' },
  { text: '배움에는 왕도가 없다.', author: '유클리드' },
  { text: '나는 할 수 있다, 나는 해낼 것이다.', author: '' },
  { text: '위기는 기회의 다른 이름이다.', author: '' },
  { text: '매일 조금씩 성장하는 것이 가장 큰 성공이다.', author: '' },
  { text: '후회 없는 오늘을 살자.', author: '' },
  { text: '시작이 반이다.', author: '' },
  { text: '멈추지 않는 한 얼마나 천천히 가느냐는 중요하지 않다.', author: '공자' },
  { text: '고통은 일시적이지만, 포기는 영원하다.', author: '' },
  { text: '꿈을 크게 꿔라. 그리고 실행하라.', author: '' },
  { text: '오늘의 고생이 내일의 행복을 만든다.', author: '' },
  { text: '자신을 믿어라. 너는 생각보다 강하다.', author: '' },
  { text: '인생은 속도가 아니라 방향이다.', author: '' },
  { text: '지금 시작하면 1년 후 감사할 것이다.', author: '' },
  { text: '열정은 전염된다. 네 열정이 주변을 바꾼다.', author: '' },
  { text: '완벽하지 않아도 괜찮다. 완벽보다 완성이 중요하다.', author: '' },
  { text: '성공의 비결은 시작하는 것이다.', author: '마크 트웨인' },
]

const COLORS = [T.teal, T.danger, T.success, T.warning, T.gold, T.teal, T.warning, T.danger]

function load(): number[] {
  try {
    const raw = localStorage.getItem('gs-motivation-favs')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function getDailyIdx(): number {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return seed % QUOTES.length
}

type Tab = 'daily' | 'random' | 'favorites'

export default function MotivationModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<Tab>('daily')
  const [favs, setFavs] = useState<number[]>(load)
  const [currentIdx, setCurrentIdx] = useState(getDailyIdx)
  const [color, setColor] = useState(COLORS[0])
  const [copied, setCopied] = useState(false)
  const [anim, setAnim] = useState(false)

  useEffect(() => { localStorage.setItem('gs-motivation-favs', JSON.stringify(favs)) }, [favs])

  const quote = QUOTES[currentIdx]
  const isFav = favs.includes(currentIdx)

  const randomQuote = useCallback(() => {
    setAnim(true)
    setTimeout(() => {
      const idx = Math.floor(Math.random() * QUOTES.length)
      setCurrentIdx(idx)
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
      setAnim(false)
    }, 300)
  }, [])

  const toggleFav = useCallback(() => {
    setFavs(prev => prev.includes(currentIdx) ? prev.filter(i => i !== currentIdx) : [...prev, currentIdx])
  }, [currentIdx])

  const copy = useCallback(() => {
    const q = QUOTES[currentIdx]
    const text = q.author ? `"${q.text}" - ${q.author}` : `"${q.text}"`
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }, [currentIdx])

  const favQuotes = useMemo(() => favs.map(i => ({ idx: i, ...QUOTES[i] })).filter(q => q.text), [favs])

  return (
    <Modal title="동기부여" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'daily' as Tab, label: '오늘의 명언' },
            { id: 'random' as Tab, label: '랜덤' },
            { id: 'favorites' as Tab, label: `즐겨찾기 (${favs.length})` },
          ]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'daily') setCurrentIdx(getDailyIdx()) }} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.label}</button>
          ))}
        </div>

        {(tab === 'daily' || tab === 'random') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {/* Quote display */}
            <div style={{
              padding: '40px 30px', borderRadius: 20, textAlign: 'center', maxWidth: 420, width: '100%',
              background: `linear-gradient(135deg, ${rgba(color, 0.07)}, ${rgba(color, 0.02)})`,
              border: `1px solid ${rgba(color, 0.19)}`,
              opacity: anim ? 0 : 1, transform: anim ? 'translateY(10px)' : 'translateY(0)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>"</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win-text)', lineHeight: 1.7, wordBreak: 'keep-all' }}>
                {quote.text}
              </div>
              {quote.author && (
                <div style={{ fontSize: 13, color, marginTop: 16, fontStyle: 'italic' }}>- {quote.author}</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {tab === 'random' && (
                <button className="win-btn-primary" onClick={randomQuote} style={{ fontSize: 12 }}>다른 명언</button>
              )}
              <button onClick={toggleFav} style={{
                padding: '6px 16px', borderRadius: 8, border: `1px solid ${isFav ? T.warning : 'var(--win-border)'}`,
                background: isFav ? rgba(T.warning, 0.1) : 'transparent',
                color: isFav ? T.warning : 'var(--win-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>{isFav ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기'}</button>
              <button className="win-btn-ghost" onClick={copy} style={{ fontSize: 12 }}>{copied ? '복사됨!' : '복사'}</button>
            </div>
          </div>
        )}

        {tab === 'favorites' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {favQuotes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>즐겨찾기한 명언이 없습니다</div>
            )}
            {favQuotes.map((q, i) => (
              <div key={q.idx} style={{
                padding: '14px 16px', borderRadius: 10,
                background: `linear-gradient(135deg, ${rgba(COLORS[i % COLORS.length], 0.03)}, transparent)`,
                border: `1px solid ${rgba(COLORS[i % COLORS.length], 0.12)}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--win-text)', lineHeight: 1.6 }}>"{q.text}"</div>
                {q.author && <div style={{ fontSize: 11, color: COLORS[i % COLORS.length], marginTop: 4 }}>- {q.author}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setCurrentIdx(q.idx); setTab('random') }} style={{ background: 'none', border: 'none', color: T.teal, cursor: 'pointer', fontSize: 11 }}>보기</button>
                  <button onClick={() => setFavs(prev => prev.filter(i => i !== q.idx))} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 11 }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
