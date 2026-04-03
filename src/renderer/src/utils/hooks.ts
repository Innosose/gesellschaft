import { useState, useCallback, useEffect, useRef } from 'react'

/** Clipboard copy with auto-reset feedback */
export function useCopyFeedback(resetMs = 1200): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), resetMs)
    } catch { /* clipboard denied */ }
  }, [resetMs])
  return [copied, copy]
}

/** localStorage-backed state with JSON serialization */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial }
    catch { return initial }
  })
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* quota exceeded */ }
      return next
    })
  }, [key])
  return [state, set]
}

/** Safe interval that auto-cleans on unmount */
export function useInterval(callback: () => void, ms: number): void {
  const savedCb = useRef(callback)
  useEffect(() => { savedCb.current = callback })
  useEffect(() => {
    const id = setInterval(() => savedCb.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** Keyboard shortcut handler */
export function useKeydown(key: string, handler: () => void, deps: unknown[] = []): void {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === key) handler() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [key, ...deps])
}
