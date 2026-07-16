import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface WeatherData {
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  units: string;
  forecast: { time: string; temp: number; description: string; icon: string }[];
  sunrise: number;
  sunset: number;
  aqi: number;
  aqiLabel: string;
  cachedAt: string;
}

async function fetchWeather(
  location: string,
  units: string,
  lang: string,
  widgetId: string,
): Promise<WeatherData> {
  const params = new URLSearchParams({ location, units, lang, widgetId });
  const res = await fetch(`${API_BASE}/weather?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useWeatherQuery({
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
    queryKey: ["weather", location, units, lang, widgetId],
    queryFn: () => fetchWeather(location, units, lang, widgetId),
    refetchInterval: enabled ? refreshInterval : false,
    staleTime: refreshInterval * 1.5,
    enabled,
  });
}
