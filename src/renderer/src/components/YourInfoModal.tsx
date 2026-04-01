import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'

interface InfoItem { label: string; value: string; copyable?: boolean }

export default function YourInfoModal({ onClose, asPanel }: { onClose: () => void; asPanel?: boolean }): React.ReactElement {
  const [info, setInfo] = useState<InfoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const items: InfoItem[] = []

    // Navigator info
    items.push({ label: 'OS', value: navigator.platform || 'Unknown' })
    items.push({ label: '브라우저 엔진', value: `Chromium ${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? 'Unknown'}` })
    items.push({ label: '언어', value: navigator.language })
    items.push({ label: 'CPU 코어', value: String(navigator.hardwareConcurrency || 'Unknown') })
    items.push({ label: '온라인', value: navigator.onLine ? '연결됨' : '오프라인' })

    // Screen
    items.push({ label: '화면 해상도', value: `${screen.width} x ${screen.height}` })
    items.push({ label: '사용 가능 영역', value: `${screen.availWidth} x ${screen.availHeight}` })
    items.push({ label: '색 깊이', value: `${screen.colorDepth}bit` })
    items.push({ label: '픽셀 비율', value: `${window.devicePixelRatio}x` })

    // Memory (if available)
    const nav = navigator as unknown as { deviceMemory?: number }
    if (nav.deviceMemory) {
      items.push({ label: '기기 메모리', value: `${nav.deviceMemory} GB` })
    }

    // Performance memory (Chromium only)
    const perf = performance as unknown as { memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number; totalJSHeapSize: number } }
    if (perf.memory) {
      items.push({ label: 'JS 힙 사용', value: `${(perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB` })
      items.push({ label: 'JS 힙 한도', value: `${(perf.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0)} MB` })
    }

    // Storage estimate
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(est => {
        if (est.quota && est.usage != null) {
          const usedGB = (est.usage / 1024 / 1024 / 1024).toFixed(2)
          const totalGB = (est.quota / 1024 / 1024 / 1024).toFixed(1)
          setInfo(prev => [...prev, { label: '저장공간 (앱)', value: `${usedGB} GB / ${totalGB} GB` }])
        }
      })
    }

    // Connection info
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }).connection
    if (conn) {
      if (conn.effectiveType) items.push({ label: '네트워크 유형', value: conn.effectiveType })
      if (conn.downlink) items.push({ label: '다운링크 속도', value: `${conn.downlink} Mbps` })
    }

    // Timezone
    items.push({ label: '시간대', value: Intl.DateTimeFormat().resolvedOptions().timeZone })
    items.push({ label: '현재 시각', value: new Date().toLocaleString('ko-KR') })

    // User Agent (copyable for support)
    items.push({ label: 'User Agent', value: navigator.userAgent, copyable: true })

    setInfo(items)
    setLoading(false)
  }, [])

  const handleCopy = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label); setTimeout(() => setCopied(''), 1200)
    } catch { /* clipboard unavailable */ }
  }, [])

  const handleCopyAll = useCallback(async () => {
    const text = info.map(i => `${i.label}: ${i.value}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied('__all__'); setTimeout(() => setCopied(''), 1200)
    } catch { /* clipboard unavailable */ }
  }, [info])

  return (
    <Modal title="Your Info" onClose={onClose} asPanel={asPanel}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: rgba(T.gold, 0.5), flex: 1 }}>내 PC 및 시스템 정보</span>
          <button onClick={handleCopyAll} style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${rgba(T.teal, 0.2)}`, background: rgba(T.teal, 0.06), color: copied === '__all__' ? T.teal : rgba(T.teal, 0.6), fontSize: 10, cursor: 'pointer' }}>
            {copied === '__all__' ? '전체 복사됨' : '전체 복사'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: rgba(T.fg, 0.3), fontSize: 12, padding: 40 }}>로딩 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {info.map(item => (
              <div key={item.label} onClick={() => handleCopy(item.label, item.value)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 4,
                background: rgba(T.gold, 0.03), border: `1px solid ${rgba(T.gold, 0.05)}`,
                cursor: 'pointer', transition: 'background 0.1s ease',
              }}>
                <span style={{ width: 110, flexShrink: 0, fontSize: 11, fontWeight: 600, color: rgba(T.gold, 0.6) }}>{item.label}</span>
                <span style={{ flex: 1, fontSize: 11, color: rgba(T.fg, 0.75), fontFamily: item.copyable ? 'monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                {copied === item.label && <span style={{ fontSize: 9, color: T.teal, flexShrink: 0 }}>복사됨</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
