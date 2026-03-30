import React, { useState } from 'react'
import { Modal } from './SearchModal'

// ── Shared helpers ─────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

function genId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

// ── VatCalc tab ────────────────────────────────────────────────────────────────

function VatTab(): React.ReactElement {
  const [vatInput, setVatInput] = React.useState('')
  const [vatMode, setVatMode] = React.useState<'excl' | 'incl'>('excl')
  const [discPrice, setDiscPrice] = React.useState('')
  const [discPct, setDiscPct] = React.useState('')
  const [items, setItems] = React.useState<LineItem[]>([
    { id: genId(), description: '', quantity: 1, unitPrice: 0 },
  ])
  const [copied, setCopied] = React.useState(false)

  const vatResult = React.useMemo(() => {
    const val = parseFloat(vatInput.replace(/,/g, '')) || 0
    if (vatMode === 'excl') {
      const supply = val
      const vat = Math.round(supply * 0.1)
      return { supply, vat, total: supply + vat }
    } else {
      const total = val
      const supply = Math.floor(total / 1.1)
      const vat = total - supply
      return { supply, vat, total }
    }
  }, [vatInput, vatMode])

  const discResult = React.useMemo(() => {
    const price = parseFloat(discPrice.replace(/,/g, '')) || 0
    const pct = parseFloat(discPct) || 0
    const discAmt = Math.round(price * pct / 100)
    return { original: price, discAmt, final: price - discAmt, pct }
  }, [discPrice, discPct])

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0)
  const quoteVat = Math.round(subtotal * 0.1)
  const grandTotal = subtotal + quoteVat

  const updateItem = (id: string, patch: Partial<LineItem>): void => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const addItem = (): void => {
    setItems(prev => [...prev, { id: genId(), description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (id: string): void => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleCopyQuote = async (): Promise<void> => {
    const lines = [
      '=== 견적서 ===',
      '',
      ...items.map(item => `${item.description || '품목'}\t${item.quantity}개 × ${fmt(item.unitPrice)}원 = ${fmt(item.quantity * item.unitPrice)}원`),
      '',
      `공급가액: ${fmt(subtotal)}원`,
      `부가세(10%): ${fmt(quoteVat)}원`,
      `합계: ${fmt(grandTotal)}원`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
      {/* 섹션 1: 부가세 계산 */}
      <div style={{ padding: 20, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)', marginBottom: 14 }}>부가세 계산</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)', display: 'block', marginBottom: 6 }}>계산 방식</label>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { id: 'excl', label: '공급가액→부가세 포함' },
                { id: 'incl', label: '부가세 포함→공급가액' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setVatMode(m.id as 'excl' | 'incl')}
                  style={{
                    padding: '6px 14px',
                    background: vatMode === m.id ? 'var(--win-accent)' : 'var(--win-surface-3)',
                    color: vatMode === m.id ? '#fff' : 'var(--win-text-sub)',
                    border: '1px solid var(--win-border)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: vatMode === m.id ? 600 : 400,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)', display: 'block', marginBottom: 6 }}>
              {vatMode === 'excl' ? '공급가액 (원)' : '부가세 포함 금액 (원)'}
            </label>
            <input
              className="win-input"
              value={vatInput}
              onChange={e => setVatInput(e.target.value)}
              placeholder="금액 입력..."
              style={{ width: 180, textAlign: 'right' }}
            />
          </div>
        </div>

        {vatInput && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: '공급가액', value: fmt(vatResult.supply), color: 'var(--win-text)' },
              { label: '부가세 (10%)', value: fmt(vatResult.vat), color: 'var(--win-warning)' },
              { label: '합계', value: fmt(vatResult.total), color: 'var(--win-accent)', big: true },
            ].map(item => (
              <div
                key={item.label}
                style={{ padding: '12px 18px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}
              >
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: item.big ? 22 : 18, fontWeight: 700, color: item.color }}>
                  {item.value}원
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 섹션 2: 할인 계산 */}
      <div style={{ padding: 20, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)', marginBottom: 14 }}>할인 계산</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)', display: 'block', marginBottom: 6 }}>원래 가격 (원)</label>
            <input
              className="win-input"
              value={discPrice}
              onChange={e => setDiscPrice(e.target.value)}
              placeholder="가격 입력..."
              style={{ width: 160, textAlign: 'right' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--win-text-muted)', display: 'block', marginBottom: 6 }}>할인율 (%)</label>
            <input
              className="win-input"
              type="number"
              value={discPct}
              onChange={e => setDiscPct(e.target.value)}
              placeholder="0-100"
              style={{ width: 100, textAlign: 'right' }}
              min={0}
              max={100}
            />
          </div>
        </div>

        {discPrice && discPct && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: '원래 가격', value: fmt(discResult.original) + '원', color: 'var(--win-text)' },
              { label: `할인 금액 (${discResult.pct}%)`, value: '-' + fmt(discResult.discAmt) + '원', color: 'var(--win-danger)' },
              { label: '최종 가격', value: fmt(discResult.final) + '원', color: 'var(--win-success)', big: true },
            ].map(item => (
              <div
                key={item.label}
                style={{ padding: '12px 18px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', textAlign: 'center' }}
              >
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: (item as any).big ? 22 : 18, fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 섹션 3: 견적서 계산기 */}
      <div style={{ padding: 20, background: 'var(--win-surface-2)', borderRadius: 10, border: '1px solid var(--win-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)' }}>견적서 계산기</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="win-btn-ghost" style={{ fontSize: 12 }} onClick={addItem}>+ 항목 추가</button>
            <button className="win-btn-secondary" style={{ fontSize: 12 }} onClick={handleCopyQuote}>
              {copied ? '✅ 복사됨' : '텍스트 복사'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 100px 32px', gap: 8, fontSize: 11, color: 'var(--win-text-muted)', paddingBottom: 4 }}>
            <span>품목/설명</span>
            <span style={{ textAlign: 'right' }}>수량</span>
            <span style={{ textAlign: 'right' }}>단가(원)</span>
            <span style={{ textAlign: 'right' }}>소계(원)</span>
            <span></span>
          </div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 100px 32px', gap: 8, alignItems: 'center' }}>
              <input
                className="win-input"
                value={item.description}
                onChange={e => updateItem(item.id, { description: e.target.value })}
                placeholder="품목명..."
                style={{ fontSize: 12 }}
              />
              <input
                className="win-input"
                type="number"
                value={item.quantity}
                onChange={e => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                style={{ textAlign: 'right', fontSize: 12 }}
              />
              <input
                className="win-input"
                type="number"
                value={item.unitPrice}
                onChange={e => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                style={{ textAlign: 'right', fontSize: 12 }}
              />
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--win-text)' }}>
                {fmt(item.quantity * item.unitPrice)}
              </div>
              <button
                className="win-btn-ghost"
                style={{ padding: '2px 6px', fontSize: 14 }}
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
              >×</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--win-surface)', borderRadius: 8, border: '1px solid var(--win-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '공급가액 (소계)', value: fmt(subtotal) + '원', color: 'var(--win-text)' },
            { label: '부가세 (10%)', value: fmt(quoteVat) + '원', color: 'var(--win-warning)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: row.color }}>
              <span>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--win-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--win-text)' }}>합계</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--win-accent)' }}>{fmt(grandTotal)}원</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ExchangeRate tab ───────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'KRW', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'AUD', 'CAD'] as const
type Currency = (typeof CURRENCIES)[number]

const CURRENCY_NAMES: Record<Currency, string> = {
  USD: '미국 달러', KRW: '한국 원', EUR: '유로', JPY: '일본 엔', CNY: '중국 위안',
  GBP: '영국 파운드', HKD: '홍콩 달러', SGD: '싱가포르 달러', AUD: '호주 달러', CAD: '캐나다 달러',
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$', KRW: '₩', EUR: '€', JPY: '¥', CNY: '¥',
  GBP: '£', HKD: 'HK$', SGD: 'S$', AUD: 'A$', CAD: 'C$',
}

function ExchangeTab(): React.ReactElement {
  const [rates, setRates] = React.useState<Record<string, number> | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [updatedAt, setUpdatedAt] = React.useState('')
  const [amount, setAmount] = React.useState('1')
  const [fromCur, setFromCur] = React.useState<Currency>('USD')
  const [toCur, setToCur] = React.useState<Currency>('KRW')

  const fetchRates = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      if (!res.ok) throw new Error('네트워크 오류')
      const data = await res.json()
      if (data.result !== 'success') throw new Error('API 오류')
      setRates(data.rates)
      setUpdatedAt(new Date(data.time_last_update_utc).toLocaleString('ko-KR'))
    } catch (e: any) {
      setError(e?.message || '환율 데이터를 불러올 수 없습니다.')
    }
    setLoading(false)
  }

  React.useEffect(() => {
    fetchRates()
  }, [])

  const convert = (from: Currency, to: Currency, amt: number): number | null => {
    if (!rates) return null
    const fromRate = rates[from]
    const toRate = rates[to]
    if (!fromRate || !toRate) return null
    return (amt / fromRate) * toRate
  }

  const result = React.useMemo(() => {
    const amt = parseFloat(amount)
    if (isNaN(amt)) return null
    return convert(fromCur, toCur, amt)
  }, [rates, amount, fromCur, toCur])

  const formatResult = (val: number, currency: Currency): string => {
    if (currency === 'KRW' || currency === 'JPY') {
      return Math.round(val).toLocaleString('ko-KR')
    }
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }

  const handleSwap = (): void => {
    setFromCur(toCur)
    setToCur(fromCur)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="win-btn-secondary" onClick={fetchRates} disabled={loading} style={{ fontSize: 12 }}>
          {loading ? '⏳ 로딩...' : '🔄 새로고침'}
        </button>
        {updatedAt && (
          <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>
            최종 업데이트: {updatedAt}
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--win-danger)', color: '#fff', borderRadius: 6, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ padding: '20px 24px', background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
            <select className="win-select" value={fromCur} onChange={e => setFromCur(e.target.value as Currency)}>
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>
              ))}
            </select>
            <input
              className="win-input"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 22, fontWeight: 700, textAlign: 'right' }}
            />
            <div style={{ fontSize: 12, color: 'var(--win-text-muted)', textAlign: 'right' }}>
              {CURRENCY_SYMBOLS[fromCur]} {parseFloat(amount || '0').toLocaleString('ko-KR')}
            </div>
          </div>

          <button className="win-btn-ghost" style={{ fontSize: 22, padding: '8px 12px', flexShrink: 0 }} onClick={handleSwap}>⇄</button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
            <select className="win-select" value={toCur} onChange={e => setToCur(e.target.value as Currency)}>
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>
              ))}
            </select>
            <div style={{ padding: '8px 12px', border: '1px solid var(--win-border)', borderRadius: 6, background: 'var(--win-surface)', fontSize: 22, fontWeight: 700, color: 'var(--win-accent)', textAlign: 'right', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {result !== null ? formatResult(result, toCur) : (loading ? '...' : '-')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--win-text-muted)', textAlign: 'right' }}>
              {CURRENCY_NAMES[toCur]}
            </div>
          </div>
        </div>

        {rates && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--win-text-muted)', textAlign: 'center' }}>
            1 {fromCur} = {(() => {
              const r = convert(fromCur, toCur, 1)
              return r !== null ? formatResult(r, toCur) : '-'
            })()} {toCur}
          </div>
        )}
      </div>

      {rates && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 10 }}>
            주요 통화 환율 (KRW 기준)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {CURRENCIES.filter(c => c !== 'KRW').map(c => {
              const r = convert(c, 'KRW', 1)
              return (
                <div key={c} style={{ padding: '12px 14px', background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--win-text)' }}>{c}</span>
                    <span style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{CURRENCY_NAMES[c]}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--win-accent)' }}>
                    ₩{r !== null ? Math.round(r).toLocaleString('ko-KR') : '-'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--win-text-muted)', marginTop: 2 }}>
                    1 {c} 기준
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── UnitConverter tab ──────────────────────────────────────────────────────────

type UnitCategory = 'length' | 'weight' | 'area' | 'temperature' | 'filesize'

interface Unit {
  id: string
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const UNITS: Record<UnitCategory, Unit[]> = {
  length: [
    { id: 'mm', label: 'mm (밀리미터)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { id: 'cm', label: 'cm (센티미터)', toBase: v => v / 100, fromBase: v => v * 100 },
    { id: 'm', label: 'm (미터)', toBase: v => v, fromBase: v => v },
    { id: 'km', label: 'km (킬로미터)', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { id: 'inch', label: 'inch (인치)', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    { id: 'feet', label: 'feet (피트)', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { id: 'yard', label: 'yard (야드)', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    { id: 'mile', label: 'mile (마일)', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
  ],
  weight: [
    { id: 'mg', label: 'mg (밀리그램)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { id: 'g', label: 'g (그램)', toBase: v => v / 1000, fromBase: v => v * 1000 },
    { id: 'kg', label: 'kg (킬로그램)', toBase: v => v, fromBase: v => v },
    { id: 't', label: 't (톤)', toBase: v => v * 1000, fromBase: v => v / 1000 },
    { id: 'lb', label: 'lb (파운드)', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
    { id: 'oz', label: 'oz (온스)', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
  ],
  area: [
    { id: 'mm2', label: 'mm² (제곱밀리미터)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { id: 'cm2', label: 'cm² (제곱센티미터)', toBase: v => v / 10000, fromBase: v => v * 10000 },
    { id: 'm2', label: 'm² (제곱미터)', toBase: v => v, fromBase: v => v },
    { id: 'km2', label: 'km² (제곱킬로미터)', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    { id: 'pyeong', label: '평 (坪)', toBase: v => v * 3.30579, fromBase: v => v / 3.30579 },
    { id: 'tsubo', label: '坪 (일본 평)', toBase: v => v * 3.30579, fromBase: v => v / 3.30579 },
    { id: 'acre', label: 'acre (에이커)', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
    { id: 'hectare', label: '헥타르 (ha)', toBase: v => v * 10000, fromBase: v => v / 10000 },
  ],
  temperature: [
    { id: 'c', label: '°C (섭씨)', toBase: v => v, fromBase: v => v },
    { id: 'f', label: '°F (화씨)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    { id: 'k', label: 'K (켈빈)', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  ],
  filesize: [
    { id: 'b', label: 'B (바이트)', toBase: v => v, fromBase: v => v },
    { id: 'kb', label: 'KB (킬로바이트)', toBase: v => v * 1024, fromBase: v => v / 1024 },
    { id: 'mb', label: 'MB (메가바이트)', toBase: v => v * 1024 * 1024, fromBase: v => v / (1024 * 1024) },
    { id: 'gb', label: 'GB (기가바이트)', toBase: v => v * 1024 ** 3, fromBase: v => v / 1024 ** 3 },
    { id: 'tb', label: 'TB (테라바이트)', toBase: v => v * 1024 ** 4, fromBase: v => v / 1024 ** 4 },
  ],
}

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  length: '길이', weight: '무게', area: '넓이', temperature: '온도', filesize: '파일 크기',
}

const CATEGORIES: UnitCategory[] = ['length', 'weight', 'area', 'temperature', 'filesize']

function UnitTab(): React.ReactElement {
  const [category, setCategory] = React.useState<UnitCategory>('length')
  const [inputValue, setInputValue] = React.useState('1')
  const [fromUnit, setFromUnit] = React.useState(UNITS.length[0].id)
  const [toUnit, setToUnit] = React.useState(UNITS.length[2].id)

  const units = UNITS[category]

  React.useEffect(() => {
    setFromUnit(units[0].id)
    setToUnit(units.length > 2 ? units[2].id : units[1].id)
  }, [category])

  const convert = (): string => {
    const val = parseFloat(inputValue)
    if (isNaN(val)) return '-'
    const from = units.find(u => u.id === fromUnit)
    const to = units.find(u => u.id === toUnit)
    if (!from || !to) return '-'
    const base = from.toBase(val)
    const result = to.fromBase(base)
    if (Math.abs(result) >= 1e10 || (Math.abs(result) < 1e-6 && result !== 0)) {
      return result.toExponential(6)
    }
    return parseFloat(result.toPrecision(10)).toLocaleString('ko-KR', { maximumFractionDigits: 8 })
  }

  const handleSwap = (): void => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  const fromUnitLabel = units.find(u => u.id === fromUnit)?.id.toUpperCase() || ''
  const toUnitLabel = units.find(u => u.id === toUnit)?.id.toUpperCase() || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--win-border)', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '8px 16px',
              background: category === cat ? 'var(--win-accent)' : 'transparent',
              color: category === cat ? '#fff' : 'var(--win-text-sub)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: category === cat ? 600 : 400,
              borderRadius: '6px 6px 0 0',
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: 'var(--win-surface-2)', borderRadius: 12, border: '1px solid var(--win-border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>입력값</label>
          <input
            className="win-input"
            type="number"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            style={{ fontSize: 20, fontWeight: 700, textAlign: 'right' }}
          />
          <select className="win-select" value={fromUnit} onChange={e => setFromUnit(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>

        <button className="win-btn-ghost" style={{ fontSize: 24, padding: '8px 12px', flexShrink: 0 }} onClick={handleSwap} title="단위 교환">↕</button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, color: 'var(--win-text-muted)' }}>결과</label>
          <div style={{ padding: '8px 12px', border: '1px solid var(--win-border)', borderRadius: 6, background: 'var(--win-surface)', fontSize: 20, fontWeight: 700, color: 'var(--win-accent)', textAlign: 'right', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {convert()}
          </div>
          <select className="win-select" value={toUnit} onChange={e => setToUnit(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <span style={{ fontSize: 18, color: 'var(--win-text-sub)' }}>{inputValue || '0'} {fromUnitLabel}</span>
        <span style={{ fontSize: 18, color: 'var(--win-text-muted)', margin: '0 12px' }}>=</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--win-accent)' }}>{convert()}</span>
        <span style={{ fontSize: 18, color: 'var(--win-text-sub)', marginLeft: 8 }}>{toUnitLabel}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-muted)', marginBottom: 10 }}>
          {CATEGORY_LABELS[category]} 단위 변환표 (기준값: {inputValue || '1'} {fromUnitLabel})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {units.map(u => {
            const val = parseFloat(inputValue) || 1
            const from = units.find(x => x.id === fromUnit)
            if (!from) return null
            const base = from.toBase(val)
            const result = u.fromBase(base)
            const display = isNaN(result) ? '-' : parseFloat(result.toPrecision(8)).toLocaleString('ko-KR', { maximumFractionDigits: 6 })
            return (
              <div
                key={u.id}
                onClick={() => setToUnit(u.id)}
                style={{
                  padding: '10px 14px',
                  background: toUnit === u.id ? 'var(--win-accent-dim)' : 'var(--win-surface-2)',
                  borderRadius: 8,
                  border: `1px solid ${toUnit === u.id ? 'var(--win-accent)' : 'var(--win-border)'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 4 }}>{u.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: toUnit === u.id ? 'var(--win-accent)' : 'var(--win-text)' }}>
                  {display}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── CalculatorModal ────────────────────────────────────────────────────────────

export default function CalculatorModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<'vat' | 'exchange' | 'unit'>('vat')

  return (
    <Modal title="계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
          {[
            { id: 'vat', label: '부가세' },
            { id: 'exchange', label: '환율' },
            { id: 'unit', label: '단위 변환' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'vat' && <VatTab />}
          {tab === 'exchange' && <ExchangeTab />}
          {tab === 'unit' && <UnitTab />}
        </div>
      </div>
    </Modal>
  )
}
