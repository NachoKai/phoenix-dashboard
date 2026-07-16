import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface GifsData {
  source: string;
  urls: string[];
  cachedAt: string;
}

async function fetchGifs(
  source: string,
  widgetId: string,
  tag: string,
  urls: string[],
): Promise<GifsData> {
  const params = new URLSearchParams({
    source,
    widgetId,
    tag,
    urls: JSON.stringify(urls),
  });
  const res = await fetch(`${API_BASE}/gifs?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useGifsQuery({
  source,
  widgetId,
  tag,
  urls,
  refreshInterval,
  enabled = true,
}: {
  source: string;
  widgetId: string;
  tag: string;
  urls: string[];
  refreshInterval: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["gifs", source, widgetId, tag, urls],
    queryFn: () => fetchGifs(source, widgetId, tag, urls),
    refetchInterval: enabled && refreshInterval > 0 ? refreshInterval : false,
    staleTime: 60 * 60_000,
    enabled,
  });
}
