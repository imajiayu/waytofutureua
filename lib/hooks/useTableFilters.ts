import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from 'react'

interface UseTableFiltersReturn<T, F> {
  filters: F
  setFilters: Dispatch<SetStateAction<F>>
  filtered: T[]
}

/**
 * Generic admin-table filter hook: keeps the filter state and the memoized
 * filtered list together so callers can avoid the recurring
 * `useState + useMemo(filter)` boilerplate.
 *
 * `predicate` is held in a ref so the memo doesn't invalidate when callers
 * pass an inline closure each render — recomputation only depends on `data`
 * and `filters`.
 */
export function useTableFilters<T, F>(
  data: T[],
  initial: F,
  predicate: (row: T, filters: F) => boolean
): UseTableFiltersReturn<T, F> {
  const [filters, setFilters] = useState<F>(initial)
  const predicateRef = useRef(predicate)
  predicateRef.current = predicate
  const filtered = useMemo(
    () => data.filter((row) => predicateRef.current(row, filters)),
    [data, filters]
  )
  return { filters, setFilters, filtered }
}
