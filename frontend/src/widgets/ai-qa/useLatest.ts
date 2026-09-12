import { useRef, useEffect } from 'react'

/**
 * Returns a ref that always holds the latest value.
 * Useful for accessing callback props inside effects/callbacks
 * without adding them to dependency arrays.
 *
 * @see https://vercel.com/docs/react/best-practices#use-latest
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref
}
