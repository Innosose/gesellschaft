/**
 * Shared modal style utilities – fluid viewport-responsive design
 *
 * All values use clamp(min, fluid, max) for consistent proportions
 * across any screen size. Base design: 1440px viewport.
 */

import { T, rgba } from './theme'

/** Common inline style patterns for modal content */
export const MS = {
  /** Standard section container — fluid padding & gap */
  section: { padding: 'clamp(12px, 1.67vw, 24px)' as unknown as number, display: 'flex', flexDirection: 'column' as const, gap: 'clamp(10px, 1.11vw, 16px)', height: '100%', overflow: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
  /** Input row with fluid gap */
  inputRow: { display: 'flex', gap: 'clamp(6px, 0.83vw, 12px)', flexWrap: 'wrap' as const, alignItems: 'center' as const },
  /** Standard themed input — fluid font/padding/radius */
  input: (): React.CSSProperties => ({
    padding: 'clamp(8px, 0.69vw, 10px) clamp(10px, 1.11vw, 16px)',
    borderRadius: 'clamp(8px, 0.83vw, 12px)', border: 'none',
    background: rgba(T.fg, 0.06), color: rgba(T.fg, 0.92),
    fontSize: 'clamp(14px, 1.18vw, 17px)', outline: 'none',
    minHeight: 'clamp(36px, 3.06vw, 44px)', lineHeight: 1.29, letterSpacing: '-0.41px',
  }),
  /** Primary action button — fluid */
  btnPrimary: (): React.CSSProperties => ({
    padding: 'clamp(8px, 0.83vw, 12px) clamp(16px, 1.67vw, 24px)',
    borderRadius: 'clamp(8px, 0.83vw, 12px)', border: 'none',
    background: rgba(T.teal, 0.15), color: T.teal,
    fontSize: 'clamp(14px, 1.18vw, 17px)', fontWeight: 600, cursor: 'pointer',
    minHeight: 'clamp(36px, 3.06vw, 44px)', lineHeight: 1.29, letterSpacing: '-0.41px',
  }),
  /** Danger action button — fluid */
  btnDanger: (): React.CSSProperties => ({
    padding: 'clamp(8px, 0.83vw, 12px) clamp(12px, 1.39vw, 20px)',
    borderRadius: 'clamp(8px, 0.83vw, 12px)', border: 'none',
    background: rgba(T.danger, 0.1), color: rgba(T.danger, 0.85),
    fontSize: 'clamp(14px, 1.18vw, 17px)', cursor: 'pointer',
    minHeight: 'clamp(36px, 3.06vw, 44px)', lineHeight: 1.29, letterSpacing: '-0.41px',
  }),
  /** Empty state placeholder — fluid */
  empty: (text: string): { style: React.CSSProperties; text: string } => ({
    style: { textAlign: 'center' as const, color: rgba(T.fg, 0.30), fontSize: 'clamp(12px, 1.04vw, 15px)', padding: 'clamp(24px, 2.78vw, 40px)', lineHeight: 1.33 },
    text,
  }),
  /** Grouped card container — fluid radius */
  group: (): React.CSSProperties => ({
    background: rgba(T.fg, 0.06), borderRadius: 'clamp(8px, 0.83vw, 12px)', overflow: 'hidden' as const,
  }),
  /** Group row item — fluid height, gap, padding */
  groupRow: (last?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center',
    gap: 'clamp(8px, 0.83vw, 12px)',
    padding: '0 clamp(10px, 1.11vw, 16px)',
    minHeight: 'clamp(36px, 3.06vw, 44px)',
    borderBottom: last ? 'none' : `0.5px solid ${rgba(T.fg, 0.08)}`,
    fontSize: 'clamp(14px, 1.18vw, 17px)', color: rgba(T.fg, 0.92), lineHeight: 1.29, letterSpacing: '-0.41px',
  }),
  /** Info item row — fluid gap */
  infoRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 'clamp(4px, 0.56vw, 8px) clamp(10px, 1.11vw, 16px)' },
  /** Small label text — fluid */
  label: (): React.CSSProperties => ({ fontSize: 'clamp(11px, 0.90vw, 13px)', color: rgba(T.fg, 0.40), marginBottom: 'clamp(2px, 0.28vw, 4px)', lineHeight: 1.38, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }),
  /** Value text — fluid */
  value: (): React.CSSProperties => ({ fontSize: 'clamp(12px, 1.04vw, 15px)', color: rgba(T.fg, 0.92), fontFamily: 'monospace', lineHeight: 1.33 }),
} as const
