import React from 'react'

/** 도구 모달 로딩 중 표시되는 스켈레톤 폴백 */
export default function ToolSkeleton(): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header skeleton */}
      <div className="skeleton" style={{ height: 20, width: '40%', borderRadius: 6 }} />

      {/* Content rows */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ height: 44, width: '100%', borderRadius: 8, opacity: 1 - i * 0.15 }} />
      ))}

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 6, opacity: 0.6 }} />
      </div>
    </div>
  )
}
