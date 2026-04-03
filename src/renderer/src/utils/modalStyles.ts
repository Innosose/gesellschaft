/**
 * Shared modal style utilities – ultra-minimal iOS-native styling
 *
 * Clean, flat, generous whitespace. Fixed px values, no fluid scaling.
 */

import { T, rgba } from './theme'

/** Common inline style patterns for modal content */
export const MS = {
  /** Standard section container */
  section: { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 20, height: '100%', overflow: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
  /** Input row */
  inputRow: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' as const },
  /** Standard themed input */
  input: (): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: 10, border: 'none',
    background: 'rgba(255,255,255,0.06)', color: rgba(T.fg, 0.92),
    fontSize: 17, outline: 'none',
    minHeight: 44, lineHeight: 1.29,
  }),
  /** Primary action button */
  btnPrimary: (): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: 10, border: 'none',
    background: T.teal, color: '#fff',
    fontSize: 17, fontWeight: 600, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.29,
  }),
  /** Danger action button */
  btnDanger: (): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: 10, border: 'none',
    background: rgba(T.danger, 0.12), color: T.danger,
    fontSize: 17, cursor: 'pointer',
    minHeight: 44, lineHeight: 1.29,
  }),
  /** Empty state placeholder */
  empty: (text: string): { style: React.CSSProperties; text: string } => ({
    style: { textAlign: 'center' as const, color: rgba(T.fg, 0.25), fontSize: 15, padding: 32, lineHeight: 1.33 },
    text,
  }),
  /** Grouped card container */
  group: (): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' as const,
  }),
  /** Group row item */
  groupRow: (last?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    minHeight: 44,
    borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
    fontSize: 17, color: rgba(T.fg, 0.92), lineHeight: 1.29,
  }),
  /** Info item row */
  infoRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px 14px' },
  /** Small label text */
  label: (): React.CSSProperties => ({ fontSize: 13, color: rgba(T.fg, 0.35), marginBottom: 4, lineHeight: 1.38, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }),
  /** Value text */
  value: (): React.CSSProperties => ({ fontSize: 15, color: rgba(T.fg, 0.92), fontFamily: 'monospace', lineHeight: 1.33 }),
} as const
