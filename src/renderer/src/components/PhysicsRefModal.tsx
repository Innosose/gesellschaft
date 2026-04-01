import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba, getCurrentTheme } from '../utils/theme'

interface Formula { name: string; equation: string; vars: string }

const DATA: Record<string, Formula[]> = {
  '역학': [
    { name: '등속도 운동', equation: 's = vt', vars: 's: 변위, v: 속도, t: 시간' },
    { name: '등가속도 (속도)', equation: 'v = v\u2080 + at', vars: 'v: 나중 속도, v\u2080: 처음 속도, a: 가속도, t: 시간' },
    { name: '등가속도 (변위)', equation: 's = v\u2080t + \u00BDat\u00B2', vars: 's: 변위, v\u2080: 처음 속도, a: 가속도, t: 시간' },
    { name: '뉴턴 제2법칙', equation: 'F = ma', vars: 'F: 힘(N), m: 질량(kg), a: 가속도(m/s\u00B2)' },
    { name: '운동 에너지', equation: 'E\u2096 = \u00BDmv\u00B2', vars: 'm: 질량, v: 속도' },
    { name: '위치 에너지', equation: 'E\u209A = mgh', vars: 'm: 질량, g: 중력 가속도, h: 높이' },
    { name: '일', equation: 'W = Fs cos\u03B8', vars: 'W: 일(J), F: 힘, s: 변위, \u03B8: 각도' },
    { name: '운동량', equation: 'p = mv', vars: 'p: 운동량, m: 질량, v: 속도' },
    { name: '충격량', equation: 'J = F\u0394t = \u0394p', vars: 'J: 충격량, F: 힘, \u0394t: 시간 변화' },
    { name: '만유인력', equation: 'F = Gm\u2081m\u2082/r\u00B2', vars: 'G: 만유인력 상수, m: 질량, r: 거리' },
  ],
  '열역학': [
    { name: '열량', equation: 'Q = mc\u0394T', vars: 'Q: 열량, m: 질량, c: 비열, \u0394T: 온도 변화' },
    { name: '열역학 제1법칙', equation: '\u0394U = Q - W', vars: '\u0394U: 내부 에너지 변화, Q: 흡수 열량, W: 한 일' },
    { name: '이상 기체', equation: 'PV = nRT', vars: 'P: 압력, V: 부피, n: 몰수, R: 기체 상수, T: 절대 온도' },
    { name: '열효율', equation: '\u03B7 = W/Q\u2095 = 1 - Q\u2096/Q\u2095', vars: '\u03B7: 효율, W: 일, Q: 열량' },
    { name: '엔트로피', equation: '\u0394S = Q/T', vars: '\u0394S: 엔트로피 변화, Q: 열량, T: 온도' },
  ],
  '전자기': [
    { name: '쿨롱 법칙', equation: 'F = kq\u2081q\u2082/r\u00B2', vars: 'k: 쿨롱 상수, q: 전하, r: 거리' },
    { name: '옴의 법칙', equation: 'V = IR', vars: 'V: 전압(V), I: 전류(A), R: 저항(\u03A9)' },
    { name: '전력', equation: 'P = VI = I\u00B2R', vars: 'P: 전력(W), V: 전압, I: 전류, R: 저항' },
    { name: '전기장', equation: 'E = F/q = kQ/r\u00B2', vars: 'E: 전기장, F: 힘, q: 전하' },
    { name: '자기력', equation: 'F = qvBsin\u03B8', vars: 'F: 자기력, q: 전하, v: 속도, B: 자기장' },
    { name: '패러데이 법칙', equation: '\u03B5 = -d\u03A6/dt', vars: '\u03B5: 유도 기전력, \u03A6: 자기 선속' },
  ],
  '파동': [
    { name: '파동 속도', equation: 'v = f\u03BB', vars: 'v: 속도, f: 진동수, \u03BB: 파장' },
    { name: '굴절 법칙', equation: 'n\u2081sin\u03B8\u2081 = n\u2082sin\u03B8\u2082', vars: 'n: 굴절률, \u03B8: 입사/굴절각' },
    { name: '도플러 효과', equation: "f' = f(v \u00B1 v\u2092)/(v \u2213 v\u209B)", vars: 'f: 진동수, v: 파동 속도, v\u2092: 관찰자, v\u209B: 음원' },
    { name: '보강 간섭', equation: '\u0394L = m\u03BB (m=0,1,2,...)', vars: '\u0394L: 경로차, \u03BB: 파장' },
    { name: '영의 이중 슬릿', equation: 'x = m\u03BBL/d', vars: 'x: 밝은 무늬 위치, L: 거리, d: 슬릿 간격' },
  ],
  '현대물리': [
    { name: '광전 효과', equation: 'E\u2096 = hf - W', vars: 'h: 플랑크 상수, f: 진동수, W: 일함수' },
    { name: '드브로이 파장', equation: '\u03BB = h/p = h/mv', vars: '\u03BB: 파장, h: 플랑크 상수, p: 운동량' },
    { name: '질량-에너지', equation: 'E = mc\u00B2', vars: 'E: 에너지, m: 질량, c: 광속' },
    { name: '불확정성 원리', equation: '\u0394x\u0394p \u2265 \u0127/2', vars: '\u0394x: 위치 불확정, \u0394p: 운동량 불확정, \u0127: 환산 플랑크 상수' },
    { name: '보어 모형', equation: 'E\u2099 = -13.6/n\u00B2 eV', vars: 'n: 주양자수' },
  ],
}

export default function PhysicsRefModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [category, setCategory] = useState(Object.keys(DATA)[0])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return DATA[category] || []
    const q = search.toLowerCase()
    return Object.values(DATA).flat().filter(f => f.name.toLowerCase().includes(q) || f.equation.toLowerCase().includes(q) || f.vars.toLowerCase().includes(q))
  }, [category, search])

  const copyFormula = (eq: string) => {
    navigator.clipboard.writeText(eq).then(() => { setCopied(eq); setTimeout(() => setCopied(null), 1200) }).catch(() => {})
  }

  return (
    <Modal title="물리 공식" onClose={onClose} asPanel={asPanel}>
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
                <button onClick={() => copyFormula(f.equation)} style={{ background: 'none', border: 'none', color: T.teal, cursor: 'pointer', fontSize: 10 }}>
                  {copied === f.equation ? '복사됨!' : '복사'}
                </button>
              </div>
              <div style={{ fontSize: 18, fontFamily: getCurrentTheme().titleFont, color: T.teal, marginBottom: 6 }}>{f.equation}</div>
              <div style={{ fontSize: 11, color: 'var(--win-text-muted)', lineHeight: 1.5 }}>{f.vars}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
