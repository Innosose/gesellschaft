import { useState, useMemo, useCallback } from 'react'

export interface PaginationResult<T> {
  page: number
  totalPages: number
  pageItems: T[]
  hasPrev: boolean
  hasNext: boolean
  goTo: (p: number) => void
  prev: () => void
  next: () => void
  reset: () => void
}

/**
 * usePagination(items, pageSize)
 *
 * 배열을 페이지 단위로 분할. 정렬/필터 결과에 바로 적용 가능.
 *
 * @example
 * const { pageItems, page, totalPages, prev, next } = usePagination(filteredFiles, 20)
 */
export function usePagination<T>(items: T[], pageSize: number): PaginationResult<T> {
  const [page, setPage] = useState(1)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize],
  )

  // Clamp page if items shrink (e.g. after filter)
  const clampedPage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, clampedPage, pageSize])

  const goTo   = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages])
  const prev   = useCallback(() => goTo(clampedPage - 1), [clampedPage, goTo])
  const next   = useCallback(() => goTo(clampedPage + 1), [clampedPage, goTo])
  const reset  = useCallback(() => setPage(1), [])

  return {
    page: clampedPage,
    totalPages,
    pageItems,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
    goTo,
    prev,
    next,
    reset,
  }
}
