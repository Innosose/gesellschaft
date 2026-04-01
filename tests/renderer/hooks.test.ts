/**
 * hooks.ts — React hooks unit tests
 * Tests useLocalStorage, useCopyFeedback, useInterval, useKeydown
 * using @testing-library/react renderHook
 */
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, useInterval, useKeydown } from '../../src/renderer/src/utils/hooks'

// ─── useLocalStorage ────────────────────────────
describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear())

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42))
    expect(result.current[0]).toBe(42)
  })

  it('reads existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('hello'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('hello')
  })

  it('updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    act(() => result.current[1](99))
    expect(result.current[0]).toBe(99)
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(99)
  })

  it('supports function updater', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 10))
    act(() => result.current[1](prev => prev + 5))
    expect(result.current[0]).toBe(15)
  })

  it('handles complex objects', () => {
    const obj = { a: 1, b: [2, 3], c: { d: true } }
    const { result } = renderHook(() => useLocalStorage('test-obj', obj))
    expect(result.current[0]).toEqual(obj)
    const newObj = { a: 2, b: [4], c: { d: false } }
    act(() => result.current[1](newObj))
    expect(result.current[0]).toEqual(newObj)
    expect(JSON.parse(localStorage.getItem('test-obj')!)).toEqual(newObj)
  })

  it('falls back to initial when localStorage has invalid JSON', () => {
    localStorage.setItem('bad-key', '{not valid json')
    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('handles arrays', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('arr', []))
    act(() => result.current[1](['a', 'b']))
    expect(result.current[0]).toEqual(['a', 'b'])
  })

  it('handles null initial value', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('nullable', null))
    expect(result.current[0]).toBeNull()
    act(() => result.current[1]('set'))
    expect(result.current[0]).toBe('set')
  })

  it('handles boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('bool', false))
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    expect(JSON.parse(localStorage.getItem('bool')!)).toBe(true)
  })
})

// ─── useInterval ────────────────────────────────
describe('useInterval', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('calls callback at specified interval', () => {
    const cb = jest.fn()
    renderHook(() => useInterval(cb, 1000))
    expect(cb).not.toHaveBeenCalled()
    jest.advanceTimersByTime(3000)
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('cleans up on unmount', () => {
    const cb = jest.fn()
    const { unmount } = renderHook(() => useInterval(cb, 500))
    jest.advanceTimersByTime(1500)
    expect(cb).toHaveBeenCalledTimes(3)
    unmount()
    jest.advanceTimersByTime(2000)
    expect(cb).toHaveBeenCalledTimes(3) // no more calls after unmount
  })

  it('uses latest callback reference', () => {
    let val = 0
    const { rerender } = renderHook(
      ({ cb }) => useInterval(cb, 500),
      { initialProps: { cb: () => { val += 1 } } }
    )
    jest.advanceTimersByTime(500)
    expect(val).toBe(1)
    rerender({ cb: () => { val += 10 } })
    jest.advanceTimersByTime(500)
    expect(val).toBe(11) // uses the updated callback
  })
})

// ─── useKeydown ─────────────────────────────────
describe('useKeydown', () => {
  it('calls handler on matching key', () => {
    const handler = jest.fn()
    renderHook(() => useKeydown('Escape', handler))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores non-matching keys', () => {
    const handler = jest.fn()
    renderHook(() => useKeydown('Escape', handler))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('removes listener on unmount', () => {
    const handler = jest.fn()
    const { unmount } = renderHook(() => useKeydown('Escape', handler))
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(handler).not.toHaveBeenCalled()
  })
})
