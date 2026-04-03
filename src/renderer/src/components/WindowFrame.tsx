/**
 * WindowFrame — macOS 스타일 창 프레임
 *
 * 도구/설정 패널을 macOS 네이티브 창처럼 감쌉니다.
 * - 타이틀 바 (트래픽 라이트 닫기 버튼 + 제목)
 * - 둥근 모서리 + 그림자
 * - 드래그 영역 (타이틀 바)
 * - 지정된 크기로 화면 중앙 배치
 */
import React, { useCallback, useRef, useState } from 'react'

interface WindowFrameProps {
  title: string
  width: number
  height: number
  onClose: () => void
  children: React.ReactNode
  /** 타이틀 바 숨김 (풀스크린 오버레이 도구용) */
  chromeless?: boolean
}

export default function WindowFrame({
  title, width, height, onClose, children, chromeless,
}: WindowFrameProps): React.ReactElement {
  const frameRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
    e.preventDefault()
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }, [dragging])

  const handleMouseUp = useCallback(() => setDragging(false), [])

  if (chromeless) return <>{children}</>

  return (
    <div
      ref={frameRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'fixed',
        left: `calc(50% - ${width / 2}px + ${offset.x}px)`,
        top: `calc(50% - ${height / 2}px + ${offset.y}px)`,
        width, height,
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#1e1e1e',
        border: '0.5px solid rgba(255,255,255,0.12)',
        boxShadow: [
          '0 24px 80px rgba(0,0,0,0.55)',
          '0 8px 24px rgba(0,0,0,0.35)',
          '0 0 0 0.5px rgba(255,255,255,0.06)',
        ].join(','),
        animation: 'windowOpen 0.25s cubic-bezier(0.16,1,0.3,1) both',
        userSelect: dragging ? 'none' : 'auto',
      }}
    >
      {/* ── 타이틀 바 ── */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: 38,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          background: '#2a2a2a',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          cursor: dragging ? 'grabbing' : 'default',
        }}
      >
        {/* 트래픽 라이트 — 닫기 버튼 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 12 }}>
          <TrafficLight color="#ff5f57" hoverSymbol="✕" onClick={onClose} />
          <TrafficLight color="#febc2e" hoverSymbol="−" disabled />
          <TrafficLight color="#28c840" hoverSymbol="+" disabled />
        </div>

        {/* 제목 — 중앙 정렬 */}
        <span style={{
          flex: 1, textAlign: 'center',
          fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.70)',
          marginRight: 68, /* 트래픽 라이트 공간 보정 */
          pointerEvents: 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </span>
      </div>

      {/* ── 콘텐츠 ── */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  )
}

/* ── 트래픽 라이트 버튼 ── */
function TrafficLight({
  color, hoverSymbol, onClick, disabled,
}: {
  color: string; hoverSymbol: string; onClick?: () => void; disabled?: boolean
}): React.ReactElement {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 12, height: 12, borderRadius: '50%',
        background: disabled ? 'rgba(255,255,255,0.12)' : color,
        border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700, lineHeight: 1,
        color: hover && !disabled ? 'rgba(0,0,0,0.5)' : 'transparent',
        transition: 'color 0.1s',
      }}
    >
      {hoverSymbol}
    </button>
  )
}
