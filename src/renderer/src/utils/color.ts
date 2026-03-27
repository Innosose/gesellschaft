/** Convert hex color + alpha to rgba() string */
export function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface AppTheme {
  id: string
  name: string
  color: string
}

export const THEMES: AppTheme[] = [
  { id: 'purple',    name: '퍼플',    color: '#8b5cf6' },
  { id: 'blue',      name: '블루',    color: '#3b82f6' },
  { id: 'cyan',      name: '시안',    color: '#06b6d4' },
  { id: 'emerald',   name: '에메랄드', color: '#10b981' },
  { id: 'rose',      name: '로즈',    color: '#f43f5e' },
  { id: 'amber',     name: '앰버',    color: '#f59e0b' },
  { id: 'pink',      name: '핑크',    color: '#ec4899' },
  { id: 'orange',    name: '오렌지',  color: '#f97316' },
  { id: 'indigo',    name: '인디고',  color: '#6366f1' },
  { id: 'slate',     name: '슬레이트', color: '#94a3b8' },
  { id: 'gold',      name: '골드',    color: '#eab308' },
  { id: 'lime',      name: '라임',    color: '#84cc16' },
]
