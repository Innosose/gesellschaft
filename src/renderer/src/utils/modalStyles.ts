/**
 * Shared modal style utilities – iOS-inspired grouped card design
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
  /** Standard themed input — iOS style */
  input: (): React.CSSProperties => ({
    padding: '12px 16px', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.05)', color: rgba(T.fg, 0.9), fontSize: 15, outline: 'none',
    minHeight: 48, lineHeight: 1.4,
  }),
  /** Primary action button — iOS style */
  btnPrimary: (): React.CSSProperties => ({
    padding: '12px 20px', borderRadius: 12, border: 'none',
    background: rgba(T.teal, 0.12), color: T.teal, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    minHeight: 48, lineHeight: 1.4,
  }),
  /** Danger action button — iOS style */
  btnDanger: (): React.CSSProperties => ({
    padding: '12px 16px', borderRadius: 12, border: 'none',
    background: rgba(T.danger, 0.08), color: rgba(T.danger, 0.8), fontSize: 15, cursor: 'pointer',
    minHeight: 48, lineHeight: 1.4,
  }),
  /** Empty state placeholder */
  empty: (text: string): { style: React.CSSProperties; text: string } => ({
    style: { textAlign: 'center' as const, color: rgba(T.fg, 0.4), fontSize: 15, padding: 40, lineHeight: 1.5 },
    text,
  }),
  /** Grouped card container — iOS inset grouped style */
  group: (): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' as const,
  }),
  /** Group row item — iOS list row */
  groupRow: (last?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
    minHeight: 48, borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
    fontSize: 15, color: rgba(T.fg, 0.85), lineHeight: 1.4,
  }),
  /** Info item row */
  infoRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px 16px' },
  /** Small label text — iOS section header style */
  label: (): React.CSSProperties => ({ fontSize: 13, color: rgba(T.fg, 0.45), marginBottom: 1, lineHeight: 1.4 }),
  /** Value text */
  value: (): React.CSSProperties => ({ fontSize: 15, color: rgba(T.fg, 0.85), fontFamily: 'monospace', lineHeight: 1.4 }),
} as const
