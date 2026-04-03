import React from 'react'
import { T, rgba } from '../utils/theme'
export default function Modal({ onClose: _onClose }: { onClose: () => void; asPanel?: boolean }) {
  return <div className="flex-1 flex items-center justify-center" style={{ color: rgba(T.gold, 0.4) }}>준비 중...</div>
}
