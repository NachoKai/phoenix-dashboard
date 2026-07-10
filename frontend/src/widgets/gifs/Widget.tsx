import { useCallback, useEffect, useState } from 'react';
import { fetchWithRetry } from '../../api';
import { WidgetCard } from '../../components/WidgetCard';
import { useWidgetData } from '../../hooks/useWidgetData';
import type { WidgetProps } from '../../types';

interface GifsData {
  source: string;
  urls: string[];
  cachedAt: string;
}

export function GifsWidget({ instance }: WidgetProps) {
  const source = (instance.config.source as string) ?? 'static';
  const urls = (instance.config.urls as string[]) ?? [];
  const tag = (instance.config.tag as string) ?? 'nature';
  const rotationInterval = ((instance.config.rotationInterval as number) ?? 30) * 1000;

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams({
      source,
      widgetId: instance.id,
      tag,
      urls: JSON.stringify(urls),
    });
    return fetchWithRetry<GifsData>(`/api/gifs?${params}`);
  }, [source, instance.id, tag, urls]);

  const { data, status, error, lastUpdated, retry } = useWidgetData<GifsData>({
    fetcher,
    refreshInterval: source === 'giphy' ? 30 * 60_000 : 0,
    staleAfterMs: 60 * 60_000,
  });

  const gifUrls = data?.urls ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [gifUrls.length]);

  useEffect(() => {
    if (gifUrls.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % gifUrls.length);
    }, rotationInterval);
    return () => clearInterval(id);
  }, [gifUrls.length, rotationInterval]);

  const effectiveStatus = gifUrls.length === 0 && status === 'success' ? 'error' : status;
  const effectiveError = gifUrls.length === 0 ? 'No GIFs configured' : error;

  return (
    <WidgetCard
      title="GIFs"
      status={effectiveStatus}
      error={effectiveError}
      lastUpdated={lastUpdated}
      onRetry={retry}
    >
      {gifUrls.length > 0 && (
        <div className="gifs-widget">
          <img
            key={gifUrls[index]}
            src={gifUrls[index]}
            alt="Animated GIF"
            className="gifs-widget__image"
            loading="lazy"
          />
          {gifUrls.length > 1 && (
            <span className="gifs-widget__counter">
              {index + 1} / {gifUrls.length}
            </span>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
