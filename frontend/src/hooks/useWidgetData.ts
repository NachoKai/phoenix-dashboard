import { useCallback, useEffect, useRef, useState } from 'react';
import type { WidgetState, WidgetStatus } from '../types';

interface UseWidgetDataOptions<T> {
  fetcher: () => Promise<T>;
  refreshInterval?: number;
  enabled?: boolean;
  staleAfterMs?: number;
}

export function useWidgetData<T>({
  fetcher,
  refreshInterval = 60_000,
  enabled = true,
  staleAfterMs = 5 * 60_000,
}: UseWidgetDataOptions<T>): WidgetState<T> & { retry: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(async () => {
    if (!enabled) return;
    if (!dataRef.current) setStatus('loading');
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStatus(dataRef.current ? 'stale' : 'error');
    }
  }, [enabled]);

  const retry = useCallback(() => {
    void doFetch();
  }, [doFetch]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    const id = setInterval(() => void doFetch(), refreshInterval);
    return () => clearInterval(id);
  }, [doFetch, enabled, refreshInterval]);

  useEffect(() => {
    if (!lastUpdated || staleAfterMs <= 0) return;
    const check = () => {
      if (Date.now() - lastUpdated.getTime() > staleAfterMs && status === 'success') {
        setStatus('stale');
      }
    };
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [lastUpdated, staleAfterMs, status]);

  useEffect(() => {
    const onOnline = () => retry();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [retry]);

  return { data, status, error, lastUpdated, retry };
}
