import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba, getCurrentTheme } from '../utils/theme'

interface Formula { name: string; equation: string; desc: string }

const DATA: Record<string, Formula[]> = {
  '미적분': [
    { name: '도함수 정의', equation: "f'(x) = lim(h\u21920) [f(x+h)-f(x)]/h", desc: '미분의 기본 정의' },
    { name: '거듭제곱 미분', equation: 'd/dx(x\u207F) = nx\u207F\u207B\u00B9', desc: 'n은 실수' },
    { name: '곱의 미분', equation: "(fg)' = f'g + fg'", desc: '두 함수의 곱의 미분' },
    { name: '몫의 미분', equation: "(f/g)' = (f'g - fg')/g\u00B2", desc: '두 함수의 몫의 미분' },
    { name: '연쇄 법칙', equation: "d/dx[f(g(x))] = f'(g(x))\u00B7g'(x)", desc: '합성 함수의 미분' },
    { name: '부정적분', equation: '\u222Bx\u207F dx = x\u207F\u207A\u00B9/(n+1) + C', desc: 'n \u2260 -1' },
    { name: '치환 적분', equation: '\u222Bf(g(x))g\'(x)dx = \u222Bf(u)du', desc: 'u = g(x)' },
    { name: '부분 적분', equation: '\u222Budv = uv - \u222Bvdu', desc: '부분 적분법' },
    { name: '미적분 기본정리', equation: '\u222B\u2090\u1D47 f(x)dx = F(b) - F(a)', desc: "F'(x) = f(x)" },
    { name: '테일러 급수', equation: 'f(x) = \u03A3 f\u207F(a)(x-a)\u207F/n!', desc: 'n=0부터 \u221E까지' },
  ],
  '선형대수': [
    { name: '행렬 곱', equation: '(AB)\u1D62\u2C7C = \u03A3A\u1D62\u2096B\u2096\u2C7C', desc: 'k에 대해 합산' },
    { name: '역행렬 (2x2)', equation: 'A\u207B\u00B9 = (1/det A)[d -b; -c a]', desc: 'A = [a b; c d]' },
    { name: '행렬식 (2x2)', equation: 'det[a b; c d] = ad - bc', desc: '2x2 행렬식' },
    { name: '고유값', equation: 'det(A - \u03BBI) = 0', desc: '\u03BB: 고유값, I: 단위행렬' },
    { name: '크래머 공식', equation: 'x\u1D62 = det(A\u1D62)/det(A)', desc: 'A\u1D62: i열을 b로 대체' },
    { name: '전치행렬', equation: '(AB)\u1D40 = B\u1D40A\u1D40', desc: '전치의 성질' },
  ],
  '확률통계': [
    { name: '기대값', equation: 'E(X) = \u03A3x\u1D62P(x\u1D62)', desc: '이산 확률 변수' },
    { name: '분산', equation: 'Var(X) = E(X\u00B2) - [E(X)]\u00B2', desc: '분산 공식' },
    { name: '표준편차', equation: '\u03C3 = \u221A(Var(X))', desc: '분산의 양의 제곱근' },
    { name: '베이즈 정리', equation: 'P(A|B) = P(B|A)P(A)/P(B)', desc: '조건부 확률' },
    { name: '이항분포', equation: 'P(X=k) = C(n,k)p\u1D4Fq\u207F\u207B\u1D4F', desc: 'q = 1-p' },
    { name: '정규분포', equation: 'f(x) = (1/\u03C3\u221A2\u03C0)e^(-(x-\u03BC)\u00B2/2\u03C3\u00B2)', desc: '\u03BC: 평균, \u03C3: 표준편차' },
    { name: '체비셰프 부등식', equation: 'P(|X-\u03BC| \u2265 k\u03C3) \u2264 1/k\u00B2', desc: 'k > 0' },
  ],
  '기하': [
    { name: '피타고라스', equation: 'a\u00B2 + b\u00B2 = c\u00B2', desc: '직각삼각형' },
    { name: '원의 넓이', equation: 'A = \u03C0r\u00B2', desc: 'r: 반지름' },
    { name: '구의 부피', equation: 'V = (4/3)\u03C0r\u00B3', desc: 'r: 반지름' },
    { name: '헤론의 공식', equation: 'A = \u221A[s(s-a)(s-b)(s-c)]', desc: 's = (a+b+c)/2' },
    { name: '두 점 사이 거리', equation: 'd = \u221A[(x\u2082-x\u2081)\u00B2 + (y\u2082-y\u2081)\u00B2]', desc: '좌표평면 위 두 점' },
    { name: '코사인 법칙', equation: 'c\u00B2 = a\u00B2 + b\u00B2 - 2ab cos C', desc: '삼각형의 세 변과 각' },
    { name: '사인 법칙', equation: 'a/sin A = b/sin B = c/sin C', desc: '삼각형의 변과 각' },
    { name: '원뿔 부피', equation: 'V = (1/3)\u03C0r\u00B2h', desc: 'r: 밑면 반지름, h: 높이' },
  ],
}

export default function MathRefModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [category, setCategory] = useState(Object.keys(DATA)[0])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return DATA[category] || []
    const q = search.toLowerCase()
    return Object.values(DATA).flat().filter(f => f.name.toLowerCase().includes(q) || f.equation.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
  }, [category, search])

  const copy = (eq: string) => {
    navigator.clipboard.writeText(eq).then(() => { setCopied(eq); setTimeout(() => setCopied(null), 1200) }).catch(() => {})
  }

  return (
    <Modal title="수학 공식" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="공식 검색..." style={{ width: '100%' }} />

        {!search.trim() && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.keys(DATA).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: category === c ? rgba(T.fg, 0.12) : 'transparent',
                color: category === c ? T.fg : rgba(T.fg, 0.45),
              }}>{c}</button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 30 }}>결과 없음</div>}
          {filtered.map((f, i) => (
            <div key={i} style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>{f.name}</span>
                <button onClick={() => copy(f.equation)} style={{ background: 'none', border: 'none', color: T.teal, cursor: 'pointer', fontSize: 10 }}>
                  {copied === f.equation ? '복사됨!' : '복사'}
                </button>
              </div>
              <div style={{ fontSize: 17, fontFamily: getCurrentTheme().titleFont, color: T.teal, marginBottom: 4 }}>{f.equation}</div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
