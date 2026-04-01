import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

type EntryType = 'income' | 'expense'

interface FinanceEntry {
  id: number
  date: string
  type: EntryType
  amount: number
  category: string
  memo: string
}

const STORAGE_KEY = 'gs-expenses'
const EXPENSE_CATEGORIES = ['식비', '교통', '교육', '문화', '의료', '쇼핑', '통신', '기타']
const INCOME_CATEGORIES = ['용돈', '아르바이트', '장학금', '기타수입']
const CATEGORY_COLORS: Record<string, string> = {
  식비: T.danger, 교통: T.teal, 교육: T.gold, 문화: T.danger,
  의료: T.success, 쇼핑: T.warning, 통신: T.gold, 기타: T.fg,
  용돈: T.success, 아르바이트: T.warning, 장학금: T.teal, 기타수입: T.success,
}
let nextId = 1

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonth(): string {
  return todayStr().slice(0, 7)
}

function load(): { entries: FinanceEntry[]; budget: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { entries: [], budget: 0 }
    const data = JSON.parse(raw)
    nextId = Math.max(...(data.entries || []).map((e: FinanceEntry) => e.id), 0) + 1
    return { entries: data.entries || [], budget: data.budget || 0 }
  } catch { return { entries: [], budget: 0 } }
}

function save(entries: FinanceEntry[], budget: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, budget }))
}

export default function ExpenseTrackerModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const initial = load()
  const [entries, setEntries] = useState<FinanceEntry[]>(initial.entries)
  const [budget, setBudget] = useState(initial.budget)
  const [date, setDate] = useState(todayStr())
  const [type, setType] = useState<EntryType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [memo, setMemo] = useState('')
  const [month, setMonth] = useState(currentMonth())

  useEffect(() => { save(entries, budget) }, [entries, budget])

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const addEntry = (): void => {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return
    setEntries(prev => [...prev, { id: nextId++, date, type, amount: amt, category, memo: memo.trim() }])
    setAmount(''); setMemo('')
  }

  const remove = (id: number): void => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const monthEntries = useMemo(() => entries.filter(e => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)), [entries, month])

  const monthSummary = useMemo(() => {
    const income = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const expense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    return { income, expense, balance: income - expense }
  }, [monthEntries])

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense').forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthEntries])

  const remaining = budget > 0 ? budget - monthSummary.expense : null

  return (
    <Modal title="가계부" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* 월 선택 + 예산 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="win-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 140 }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>예산:</span>
          <input className="win-input" type="number" value={budget || ''} onChange={e => setBudget(parseInt(e.target.value) || 0)} placeholder="월 예산" style={{ width: 100, textAlign: 'right' }} />
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>원</span>
        </div>

        {/* 월간 요약 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '수입', value: `${monthSummary.income.toLocaleString()}원`, color: T.success },
            { label: '지출', value: `${monthSummary.expense.toLocaleString()}원`, color: T.danger },
            { label: remaining !== null ? '남은 예산' : '잔액', value: `${(remaining !== null ? remaining : monthSummary.balance).toLocaleString()}원`, color: (remaining !== null ? remaining : monthSummary.balance) >= 0 ? T.teal : T.danger },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '8px 10px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--win-text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['expense', 'income'] as EntryType[]).map(t => (
              <button key={t} onClick={() => { setType(t); setCategory(t === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]) }} style={{
                padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: type === t ? (t === 'expense' ? rgba(T.danger, 0.2) : rgba(T.success, 0.2)) : 'transparent',
                color: type === t ? (t === 'expense' ? T.danger : T.success) : 'var(--win-text-muted)',
              }}>{t === 'expense' ? '지출' : '수입'}</button>
            ))}
          </div>
          <input className="win-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 130 }} />
          <select className="win-select" value={category} onChange={e => setCategory(e.target.value)} style={{ fontSize: 11 }}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="win-input" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEntry()} placeholder="금액" type="number" style={{ width: 80, textAlign: 'right' }} />
          <input className="win-input" value={memo} onChange={e => setMemo(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEntry()} placeholder="메모" style={{ flex: 1, minWidth: 80 }} />
          <button className="win-btn-primary" onClick={addEntry} style={{ fontSize: 12 }}>추가</button>
        </div>

        {/* 카테고리 분석 */}
        {categoryBreakdown.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categoryBreakdown.map(([cat, amt]) => (
              <span key={cat} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: rgba(CATEGORY_COLORS[cat] || T.fg, 0.13), color: CATEGORY_COLORS[cat] || T.fg }}>
                {cat} {amt.toLocaleString()}원
              </span>
            ))}
          </div>
        )}

        {/* 거래 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {monthEntries.length === 0 && <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', fontSize: 13, padding: 40 }}>거래 내역이 없습니다</div>}
          {monthEntries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
              <span style={{ fontSize: 11, color: 'var(--win-text-muted)', minWidth: 60 }}>{e.date.slice(5)}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: rgba(CATEGORY_COLORS[e.category] || T.fg, 0.13), color: CATEGORY_COLORS[e.category] || T.fg }}>{e.category}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--win-text-sub)' }}>{e.memo || '-'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: e.type === 'income' ? T.success : T.danger }}>
                {e.type === 'income' ? '+' : '-'}{e.amount.toLocaleString()}원
              </span>
              <button onClick={() => remove(e.id)} style={{ background: 'none', border: 'none', color: 'var(--win-text-muted)', cursor: 'pointer', fontSize: 10 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
