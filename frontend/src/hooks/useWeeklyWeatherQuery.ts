import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface DailyForecast {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  description: string;
}

export interface WeeklyWeatherData {
  location: string;
  units: string;
  daily: DailyForecast[];
  cachedAt: string;
}

async function fetchWeeklyWeather(
  location: string,
  units: string,
  lang: string,
  widgetId: string,
): Promise<WeeklyWeatherData> {
  const params = new URLSearchParams({ location, units, lang, widgetId });
  const res = await fetch(`${API_BASE}/weather-weekly?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useWeeklyWeatherQuery({
  location,
  units,
  lang,
  widgetId,
  refreshInterval,
  enabled = true,
}: {
  location: string;
  units: string;
  lang: string;
  widgetId: string;
  refreshInterval: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["weather-weekly", location, units, lang, widgetId],
    queryFn: () => fetchWeeklyWeather(location, units, lang, widgetId),
    refetchInterval: enabled ? refreshInterval : false,
    staleTime: refreshInterval * 1.5,
    enabled,
  });
}
