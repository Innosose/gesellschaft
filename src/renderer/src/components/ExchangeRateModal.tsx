import React from 'react'
import { Modal } from './SearchModal'

const CURRENCIES = ['USD', 'KRW', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'AUD', 'CAD'] as const
type Currency = (typeof CURRENCIES)[number]

const CURRENCY_NAMES: Record<Currency, string> = {
  USD: '미국 달러',
  KRW: '한국 원',
  EUR: '유로',
  JPY: '일본 엔',
  CNY: '중국 위안',
  GBP: '영국 파운드',
  HKD: '홍콩 달러',
  SGD: '싱가포르 달러',
  AUD: '호주 달러',
  CAD: '캐나다 달러',
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$', KRW: '₩', EUR: '€', JPY: '¥', CNY: '¥',
  GBP: '£', HKD: 'HK$', SGD: 'S$', AUD: 'A$', CAD: 'C$',
}


interface ExchangeRateModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function ExchangeRateModal({ onClose, asPanel }: ExchangeRateModalProps): React.ReactElement {
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
    <Modal title="환율 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* 헤더 */}
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

        {/* 환율 계산기 */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--win-surface-2)',
            borderRadius: 12,
            border: '1px solid var(--win-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
              <select
                className="win-select"
                value={fromCur}
                onChange={e => setFromCur(e.target.value as Currency)}
              >
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

            {/* 교환 버튼 */}
            <button
              className="win-btn-ghost"
              style={{ fontSize: 22, padding: '8px 12px', flexShrink: 0 }}
              onClick={handleSwap}
            >⇄</button>

            {/* To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
              <select
                className="win-select"
                value={toCur}
                onChange={e => setToCur(e.target.value as Currency)}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>
                ))}
              </select>
              <div
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--win-border)',
                  borderRadius: 6,
                  background: 'var(--win-surface)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--win-accent)',
                  textAlign: 'right',
                  minHeight: 46,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {result !== null ? formatResult(result, toCur) : (loading ? '...' : '-')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--win-text-muted)', textAlign: 'right' }}>
                {CURRENCY_NAMES[toCur]}
              </div>
            </div>
          </div>

          {/* 환율 표시 */}
          {rates && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--win-text-muted)', textAlign: 'center' }}>
              1 {fromCur} = {(() => {
                const r = convert(fromCur, toCur, 1)
                return r !== null ? formatResult(r, toCur) : '-'
              })()} {toCur}
            </div>
          )}
        </div>

        {/* 주요 통화 대 KRW 환율표 */}
        {rates && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 10 }}>
              주요 통화 환율 (KRW 기준)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {CURRENCIES.filter(c => c !== 'KRW').map(c => {
                const r = convert(c, 'KRW', 1)
                return (
                  <div
                    key={c}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--win-surface-2)',
                      borderRadius: 8,
                      border: '1px solid var(--win-border)',
                    }}
                  >
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
    </Modal>
  )
}
