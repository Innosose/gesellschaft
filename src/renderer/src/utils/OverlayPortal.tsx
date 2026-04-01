import React from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children in a fullscreen fixed overlay above everything else.
 * Used by overlay tools (Ruler, ScreenPen, Spotlight, ScreenPin) to escape
 * the ToolPanel modal's overflow:hidden and render on the full screen.
 */
export default function OverlayPortal({ children }: { children: React.ReactNode }): React.ReactPortal | null {
  const el = document.getElementById('overlay-portal')
  if (!el) return null
  return createPortal(children, el)
}
