/**
 * Shared modal style utilities
 *
 * Many tool modals repeat the same inline style patterns (inputs, buttons,
 * sections, empty states, etc.). This module centralises those patterns so
 * new modals stay visually consistent without copy-pasting.
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
  section: { padding: 'clamp(12px, 3vw, 20px)' as unknown as number, display: 'flex', flexDirection: 'column' as const, gap: 12, height: '100%', overflow: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
  /** Input row with gap */
  inputRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' as const },
  /** Standard themed input */
  input: (): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: 4, border: `1px solid ${rgba(T.gold, 0.15)}`,
    background: rgba(T.gold, 0.04), color: rgba(T.fg, 0.9), fontSize: 13, outline: 'none',
    minHeight: 44, lineHeight: 1.4,
  }),
  /** Primary action button */
  btnPrimary: (): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 4, border: `1px solid ${rgba(T.teal, 0.3)}`,
    background: rgba(T.teal, 0.08), color: T.teal, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.4,
  }),
  /** Danger action button */
  btnDanger: (): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: 4, border: `1px solid ${rgba(T.danger, 0.15)}`,
    background: rgba(T.danger, 0.04), color: rgba(T.danger, 0.7), fontSize: 11, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.4,
  }),
  /** Empty state placeholder */
  empty: (text: string): { style: React.CSSProperties; text: string } => ({
    style: { textAlign: 'center' as const, color: rgba(T.fg, 0.35), fontSize: 13, padding: 40, lineHeight: 1.5 },
    text,
  }),
  /** Info item row */
  infoRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px 16px' },
  /** Small label text */
  label: (): React.CSSProperties => ({ fontSize: 11, color: rgba(T.gold, 0.6), marginBottom: 1, lineHeight: 1.4 }),
  /** Value text */
  value: (): React.CSSProperties => ({ fontSize: 12, color: rgba(T.fg, 0.75), fontFamily: 'monospace', lineHeight: 1.4 }),
} as const
