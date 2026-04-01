import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface Formula {
  id: string
  category: string
  name: string
  formula: string
  description: string
  custom?: boolean
}

const STORAGE_KEY = 'gs-formulas'

const BUILT_IN: Formula[] = [
  // 수학
  { id: 'math-1', category: '수학', name: '이차방정식 근의 공식', formula: 'x = (-b ± √(b²-4ac)) / 2a', description: 'ax² + bx + c = 0의 근' },
  { id: 'math-2', category: '수학', name: '피타고라스 정리', formula: 'a² + b² = c²', description: '직각삼각형의 세 변의 관계' },
  { id: 'math-3', category: '수학', name: '원의 넓이', formula: 'S = πr²', description: '반지름 r인 원' },
  { id: 'math-4', category: '수학', name: '삼각함수 항등식', formula: 'sin²θ + cos²θ = 1', description: '기본 삼각함수 항등식' },
  { id: 'math-5', category: '수학', name: '등차수열 합', formula: 'Sₙ = n(a₁ + aₙ)/2', description: '첫째항 a₁, n번째항 aₙ' },
  { id: 'math-6', category: '수학', name: '등비수열 합', formula: 'Sₙ = a₁(rⁿ - 1)/(r - 1)', description: '첫째항 a₁, 공비 r' },
  { id: 'math-7', category: '수학', name: '미분 기본', formula: "d/dx(xⁿ) = nxⁿ⁻¹", description: '거듭제곱 함수의 미분' },
  { id: 'math-8', category: '수학', name: '적분 기본', formula: '∫xⁿdx = xⁿ⁺¹/(n+1) + C', description: 'n ≠ -1' },
  // 물리
  { id: 'phys-1', category: '물리', name: '뉴턴 제2법칙', formula: 'F = ma', description: '힘 = 질량 × 가속도' },
  { id: 'phys-2', category: '물리', name: '운동에너지', formula: 'Ek = ½mv²', description: '질량 m, 속도 v' },
  { id: 'phys-3', category: '물리', name: '위치에너지', formula: 'Ep = mgh', description: '질량 m, 높이 h' },
  { id: 'phys-4', category: '물리', name: '등가속도 운동', formula: 'v² = v₀² + 2as', description: '초기속도 v₀, 가속도 a, 거리 s' },
  { id: 'phys-5', category: '물리', name: '만유인력', formula: 'F = GMm/r²', description: '두 물체 사이의 중력' },
  { id: 'phys-6', category: '물리', name: '쿨롱 법칙', formula: 'F = kq₁q₂/r²', description: '두 전하 사이의 힘' },
  { id: 'phys-7', category: '물리', name: '옴의 법칙', formula: 'V = IR', description: '전압 = 전류 × 저항' },
  // 화학
  { id: 'chem-1', category: '화학', name: '이상기체 방정식', formula: 'PV = nRT', description: '압력, 부피, 몰수, 온도' },
  { id: 'chem-2', category: '화학', name: '몰 농도', formula: 'M = n/V (mol/L)', description: '용질의 몰수 / 용액의 부피' },
  { id: 'chem-3', category: '화학', name: '아보가드로 수', formula: 'Nₐ = 6.022 × 10²³', description: '1몰의 입자 수' },
  { id: 'chem-4', category: '화학', name: 'pH 정의', formula: 'pH = -log[H⁺]', description: '수소이온 농도의 음의 상용로그' },
  { id: 'chem-5', category: '화학', name: '보일 법칙', formula: 'P₁V₁ = P₂V₂', description: '온도 일정 시 압력과 부피 관계' },
]

const CATEGORIES = ['수학', '물리', '화학']

function loadCustom(): Formula[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Formula[]
  } catch { return [] }
}

function saveCustom(items: Formula[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function FormulaBookModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [custom, setCustom] = useState<Formula[]>(loadCustom)
  const [category, setCategory] = useState('수학')
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [description, setDescription] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const allFormulas = useMemo(() => [...BUILT_IN, ...custom], [custom])

  const filtered = useMemo(() => {
    let list = allFormulas.filter(f => f.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = allFormulas.filter(f => f.name.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
    }
    return list
  }, [allFormulas, category, search])

  const addFormula = (): void => {
    if (!name.trim() || !formula.trim()) return
    const newF: Formula = { id: `custom-${Date.now()}`, category, name: name.trim(), formula: formula.trim(), description: description.trim(), custom: true }
    const next = [...custom, newF]
    setCustom(next)
    saveCustom(next)
    setName(''); setFormula(''); setDescription('')
  }

  const removeCustom = (id: string): void => {
    const next = custom.filter(f => f.id !== id)
    setCustom(next)
    saveCustom(next)
  }

  const copyFormula = (text: string, id: string): void => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Modal title="공식 모음집" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 탭 + 검색 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c); setSearch('') }} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: category === c && !search ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: category === c && !search ? T.fg : rgba(T.fg, 0.45),
            }}>{c}</button>
          ))}
          <input className="win-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ flex: 1, fontSize: 12 }} />
        </div>

        {/* 공식 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>공식이 없습니다</div>}
          {filtered.map(f => (
            <div key={f.id} style={{ padding: '10px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)' }}>{f.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="win-btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => copyFormula(f.formula, f.id)}>
                    {copied === f.id ? '복사됨!' : '복사'}
                  </button>
                  {f.custom && <button className="win-btn-danger" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => removeCustom(f.id)}>×</button>}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.teal, fontFamily: 'monospace', padding: '6px 0' }}>{f.formula}</div>
              {f.description && <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{f.description}</div>}
            </div>
          ))}
        </div>

        {/* 추가 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--win-text-muted)' }}>공식 직접 추가</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={name} onChange={e => setName(e.target.value)} placeholder="공식 이름" style={{ flex: 1 }} />
            <input className="win-input" value={formula} onChange={e => setFormula(e.target.value)} placeholder="공식 (예: E = mc²)" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="win-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="설명 (선택)" style={{ flex: 1 }} />
            <button className="win-btn-primary" onClick={addFormula} style={{ fontSize: 12 }}>추가</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
