import React, { useState, useMemo } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

const ELEMENTS: Record<string, { name: string; weight: number; number: number }> = {
  H:{name:'수소',weight:1.008,number:1},He:{name:'헬륨',weight:4.003,number:2},Li:{name:'리튬',weight:6.941,number:3},
  Be:{name:'베릴륨',weight:9.012,number:4},B:{name:'붕소',weight:10.81,number:5},C:{name:'탄소',weight:12.011,number:6},
  N:{name:'질소',weight:14.007,number:7},O:{name:'산소',weight:15.999,number:8},F:{name:'플루오린',weight:18.998,number:9},
  Ne:{name:'네온',weight:20.180,number:10},Na:{name:'나트륨',weight:22.990,number:11},Mg:{name:'마그네슘',weight:24.305,number:12},
  Al:{name:'알루미늄',weight:26.982,number:13},Si:{name:'규소',weight:28.086,number:14},P:{name:'인',weight:30.974,number:15},
  S:{name:'황',weight:32.065,number:16},Cl:{name:'염소',weight:35.453,number:17},Ar:{name:'아르곤',weight:39.948,number:18},
  K:{name:'칼륨',weight:39.098,number:19},Ca:{name:'칼슘',weight:40.078,number:20},Fe:{name:'철',weight:55.845,number:26},
  Cu:{name:'구리',weight:63.546,number:29},Zn:{name:'아연',weight:65.38,number:30},Ag:{name:'은',weight:107.868,number:47},
  Au:{name:'금',weight:196.967,number:79},Br:{name:'브로민',weight:79.904,number:35},I:{name:'아이오딘',weight:126.904,number:53},
  Mn:{name:'망가니즈',weight:54.938,number:25},Cr:{name:'크로뮴',weight:51.996,number:24},Ni:{name:'니켈',weight:58.693,number:28},
  Pb:{name:'납',weight:207.2,number:82},Sn:{name:'주석',weight:118.71,number:50},Ti:{name:'타이타늄',weight:47.867,number:22},
  Ba:{name:'바륨',weight:137.327,number:56},Sr:{name:'스트론튬',weight:87.62,number:38},
}

function parseMolecular(formula: string): { element: string; count: number }[] | null {
  const parts: { element: string; count: number }[] = []
  const re = /([A-Z][a-z]?)(\d*)/g
  let m: RegExpExecArray | null
  let total = ''
  while ((m = re.exec(formula)) !== null) {
    if (!m[1]) continue
    total += m[0]
    if (!ELEMENTS[m[1]]) return null
    parts.push({ element: m[1], count: parseInt(m[2]) || 1 })
  }
  if (total !== formula || parts.length === 0) return null
  return parts
}

type Tab = 'weight' | 'molarity' | 'table'

export default function ChemCalcModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [tab, setTab] = useState<Tab>('weight')
  const [formula, setFormula] = useState('H2O')
  const [mass, setMass] = useState('')
  const [volume, setVolume] = useState('')
  const [molarity, setMolarity] = useState('')

  const parsed = useMemo(() => parseMolecular(formula), [formula])
  const mw = useMemo(() => parsed ? parsed.reduce((s, p) => s + ELEMENTS[p.element].weight * p.count, 0) : null, [parsed])

  const molarityResult = useMemo(() => {
    const m = parseFloat(mass), v = parseFloat(volume), mol = parseFloat(molarity)
    if (m && v && mw) return { moles: m / mw, molarity: (m / mw) / (v / 1000) }
    if (mol && v && mw) return { moles: mol * (v / 1000), mass: mol * (v / 1000) * mw }
    return null
  }, [mass, volume, molarity, mw])

  return (
    <Modal title="화학 계산기" onClose={onClose} asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {([
            { id: 'weight' as Tab, l: '분자량' }, { id: 'molarity' as Tab, l: '몰 농도' }, { id: 'table' as Tab, l: '원소 목록' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
              color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
            }}>{t.l}</button>
          ))}
        </div>

        {tab === 'weight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--win-text-sub)', marginBottom: 4, display: 'block' }}>화학식</label>
              <input className="win-input" value={formula} onChange={e => setFormula(e.target.value)} placeholder="H2O, NaCl, C6H12O6..." style={{ width: '100%', fontFamily: 'monospace', fontSize: 16 }} />
            </div>
            {parsed && mw !== null ? (
              <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.teal, marginBottom: 12 }}>{mw.toFixed(3)} g/mol</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {parsed.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${rgba(T.fg, 0.05)}` }}>
                      <span style={{ color: 'var(--win-text)' }}>{p.element} ({ELEMENTS[p.element].name}) x{p.count}</span>
                      <span style={{ color: 'var(--win-text-muted)', fontFamily: 'monospace' }}>{(ELEMENTS[p.element].weight * p.count).toFixed(3)} g/mol</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : formula.trim() ? (
              <div style={{ color: 'var(--win-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>올바른 화학식을 입력하세요 (예: H2O, NaCl)</div>
            ) : null}
          </div>
        )}

        {tab === 'molarity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>화학식: {formula} {mw ? `(${mw.toFixed(2)} g/mol)` : '(유효하지 않음)'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>질량 (g)</label><input className="win-input" type="number" value={mass} onChange={e => setMass(e.target.value)} style={{ width: '100%' }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>부피 (mL)</label><input className="win-input" type="number" value={volume} onChange={e => setVolume(e.target.value)} style={{ width: '100%' }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: 'var(--win-text-muted)', display: 'block', marginBottom: 2 }}>몰 농도 (M)</label><input className="win-input" type="number" value={molarity} onChange={e => setMolarity(e.target.value)} style={{ width: '100%' }} /></div>
            </div>
            {molarityResult && (
              <div style={{ background: 'var(--win-surface-2)', borderRadius: 8, border: '1px solid var(--win-border)', padding: 12 }}>
                {'molarity' in molarityResult && <div style={{ fontSize: 14, color: T.teal, fontWeight: 600 }}>몰 농도: {molarityResult.molarity!.toFixed(4)} M</div>}
                {'moles' in molarityResult && <div style={{ fontSize: 13, color: 'var(--win-text)' }}>몰 수: {molarityResult.moles.toFixed(4)} mol</div>}
                {'mass' in molarityResult && molarityResult.mass !== undefined && <div style={{ fontSize: 13, color: 'var(--win-text)' }}>질량: {molarityResult.mass.toFixed(3)} g</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'table' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 4 }}>
            {Object.entries(ELEMENTS).sort((a, b) => a[1].number - b[1].number).map(([sym, el]) => (
              <div key={sym} onClick={() => { setFormula(f => f + sym); setTab('weight') }} style={{
                padding: '6px 4px', background: 'var(--win-surface-2)', borderRadius: 6, border: '1px solid var(--win-border)',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{el.number}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.teal }}>{sym}</div>
                <div style={{ fontSize: 9, color: 'var(--win-text-muted)' }}>{el.weight.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
