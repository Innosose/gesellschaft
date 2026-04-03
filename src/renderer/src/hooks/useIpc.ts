import { useState, useEffect, useCallback, useRef } from 'react'

interface UseIpcState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * useIpc<T>(fn, deps?)
 *
 * IPC 호출을 React 훅으로 래핑. 로딩·에러 상태와 수동 refetch를 제공.
 *
 * @example
 * const { data: todos, loading, refetch } = useIpc(() => window.api.todo.get())
 */
export function useIpc<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): UseIpcState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseIpcState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  // Keep a stable ref to fn so the effect dep array stays minimal
  const fnRef = useRef(fn)
  fnRef.current = fn

  const call = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }))
    fnRef.current()
      .then(data => setState({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) })
      )
  }, [])

  // Re-run whenever deps change (mirrors useEffect semantics)
  useEffect(() => {
    call()
  }, [call, ...deps])

  return { ...state, refetch: call }
}
