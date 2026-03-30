import React from 'react'
import { Modal } from './SearchModal'

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

interface VatCalcModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function VatCalcModal({ onClose, asPanel }: VatCalcModalProps): React.ReactElement {
  // 부가세 계산
  const [vatInput, setVatInput] = React.useState('')
  const [vatMode, setVatMode] = React.useState<'excl' | 'incl'>('excl')

  // 할인 계산
  const [discPrice, setDiscPrice] = React.useState('')
  const [discPct, setDiscPct] = React.useState('')

  // 견적서
  const [items, setItems] = React.useState<LineItem[]>([
    { id: genId(), description: '', quantity: 1, unitPrice: 0 },
  ])
  const [copied, setCopied] = React.useState(false)

  // 부가세 계산 결과
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

  // 할인 계산 결과
  const discResult = React.useMemo(() => {
    const price = parseFloat(discPrice.replace(/,/g, '')) || 0
    const pct = parseFloat(discPct) || 0
    const discAmt = Math.round(price * pct / 100)
    return { original: price, discAmt, final: price - discAmt, pct }
  }, [discPrice, discPct])

  // 견적서 계산
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
    <Modal title="부가세 / 할인 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
        {/* 섹션 1: 부가세 계산 */}
        <div
          style={{
            padding: 20,
            background: 'var(--win-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--win-border)',
          }}
        >
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
                  style={{
                    padding: '12px 18px',
                    background: 'var(--win-surface)',
                    borderRadius: 8,
                    border: '1px solid var(--win-border)',
                    textAlign: 'center',
                  }}
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
        <div
          style={{
            padding: 20,
            background: 'var(--win-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--win-border)',
          }}
        >
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
                  style={{
                    padding: '12px 18px',
                    background: 'var(--win-surface)',
                    borderRadius: 8,
                    border: '1px solid var(--win-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--win-text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: item.big ? 22 : 18, fontWeight: 700, color: item.color }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 섹션 3: 견적서 계산기 */}
        <div
          style={{
            padding: 20,
            background: 'var(--win-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--win-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--win-text)' }}>견적서 계산기</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="win-btn-ghost" style={{ fontSize: 12 }} onClick={addItem}>+ 항목 추가</button>
              <button className="win-btn-secondary" style={{ fontSize: 12 }} onClick={handleCopyQuote}>
                {copied ? '✅ 복사됨' : '텍스트 복사'}
              </button>
            </div>
          </div>

          {/* 항목 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* 헤더 */}
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

          {/* 합계 */}
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: 'var(--win-surface)',
              borderRadius: 8,
              border: '1px solid var(--win-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
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
    </Modal>
  )
}
