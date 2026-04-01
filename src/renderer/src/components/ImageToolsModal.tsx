import React, { useState } from 'react'
import { Modal } from './SearchModal'
import { T, rgba } from '../utils/theme'
import { OcrContent } from './OcrModal'
import { ImageConvertContent } from './ImageConvertModal'
import { QrCodeContent } from './QrCodeModal'
import { ColorPickerContent } from './ColorPickerModal'

type Tab = 'ocr' | 'convert' | 'qr' | 'color'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ocr',     label: 'OCR 텍스트 추출' },
  { id: 'convert', label: '이미지 변환' },
  { id: 'qr',      label: 'QR 코드' },
  { id: 'color',   label: '색상 피커' },
]

interface ImageToolsModalProps {
  onClose: () => void
  asPanel?: boolean
}

export default function ImageToolsModal({ onClose, asPanel }: ImageToolsModalProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('ocr')

  return (
    <Modal title="이미지 도구" onClose={onClose} wide asPanel={asPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rgba(T.fg, 0.08)}`, paddingBottom: 8 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: tab === t.id ? rgba(T.fg, 0.12) : 'transparent',
                color: tab === t.id ? T.fg : rgba(T.fg, 0.45),
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'ocr'     && <OcrContent />}
          {tab === 'convert' && <ImageConvertContent />}
          {tab === 'qr'      && <QrCodeContent />}
          {tab === 'color'   && <ColorPickerContent />}
        </div>
      </div>
    </Modal>
  )
}
