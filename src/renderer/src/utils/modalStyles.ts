/**
 * Shared modal style utilities – Apple-inspired grouped card design
 *
 * Usage:
 *   import { MS } from '../utils/modalStyles'
 *   <div style={MS.section}> ... </div>
 *   <input style={MS.input()} />
 *   <button style={MS.btnPrimary()}>Go</button>
 */

import { T, rgba } from './theme'

/** Common inline style patterns for modal content */
export const MS = {
  /** Standard section container with padding — responsive */
  section: { padding: 'clamp(16px, 4vw, 24px)' as unknown as number, display: 'flex', flexDirection: 'column' as const, gap: 16, height: '100%', overflow: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
  /** Input row with gap */
  inputRow: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' as const },
  /** Standard themed input — Apple style */
  input: (): React.CSSProperties => ({
    padding: '10px 14px', borderRadius: 10, border: 'none',
    background: rgba(T.fg, 0.06), color: rgba(T.fg, 0.9), fontSize: 17, outline: 'none',
    minHeight: 44, lineHeight: 1.3, letterSpacing: '-0.02em',
  }),
  /** Primary action button — Apple tinted style */
  btnPrimary: (): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: rgba(T.teal, 0.15), color: T.teal, fontSize: 17, fontWeight: 600, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.3, letterSpacing: '-0.02em',
  }),
  /** Danger action button */
  btnDanger: (): React.CSSProperties => ({
    padding: '10px 16px', borderRadius: 10, border: 'none',
    background: rgba(T.danger, 0.1), color: rgba(T.danger, 0.85), fontSize: 17, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.3, letterSpacing: '-0.02em',
  }),
  /** Empty state placeholder */
  empty: (text: string): { style: React.CSSProperties; text: string } => ({
    style: { textAlign: 'center' as const, color: rgba(T.fg, 0.3), fontSize: 15, padding: 40, lineHeight: 1.5 },
    text,
  }),
  /** Grouped card container — Apple inset grouped style */
  group: (): React.CSSProperties => ({
    background: rgba(T.fg, 0.06), borderRadius: 10, overflow: 'hidden' as const,
  }),
  /** Group row item — Apple list row */
  groupRow: (last?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
    minHeight: 44, borderBottom: last ? 'none' : `0.5px solid ${rgba(T.fg, 0.08)}`,
    fontSize: 17, color: rgba(T.fg, 0.9), lineHeight: 1.3, letterSpacing: '-0.02em',
  }),
  /** Info item row */
  infoRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px 16px' },
  /** Small label text — Apple section header style */
  label: (): React.CSSProperties => ({ fontSize: 13, color: rgba(T.fg, 0.4), marginBottom: 2, lineHeight: 1.4, textTransform: 'uppercase' as const }),
  /** Value text */
  value: (): React.CSSProperties => ({ fontSize: 15, color: rgba(T.fg, 0.9), fontFamily: 'monospace', lineHeight: 1.4 }),
} as const
