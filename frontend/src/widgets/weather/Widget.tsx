import { useCallback } from "react";
import { fetchWithRetry } from "../../api";
import { WidgetCard } from "../../components/WidgetCard";
import { useWidgetData } from "../../hooks/useWidgetData";
import type { WidgetProps } from "../../types";

interface WeatherData {
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  units: string;
  forecast: { time: string; temp: number; description: string; icon: string }[];
  cachedAt: string;
}

const WEATHER_ICONS: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "⛅",
  "02n": "☁️",
  "03d": "☁️",
  "03n": "☁️",
  "04d": "☁️",
  "04n": "☁️",
  "09d": "🌧️",
  "09n": "🌧️",
  "10d": "🌦️",
  "10n": "🌧️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50n": "🌫️",
};

export function WeatherWidget({ instance, sleeping }: WidgetProps) {
  const location = (instance.config.location as string) ?? "Buenos Aires";
  const units = (instance.config.units as string) ?? "metric";
  const lang = (instance.config.lang as string) ?? "en";
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 600) * 1000;
  const unitSymbol = units === "imperial" ? "°F" : "°C";

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams({
      location,
      units,
      lang,
      widgetId: instance.id,
    });
    return fetchWithRetry<WeatherData>(`/api/weather?${params}`);
  }, [location, units, lang, instance.id]);

  const { data, status, error, retry } = useWidgetData<WeatherData>({
    fetcher,
    refreshInterval,
    staleAfterMs: refreshInterval * 1.5,
    enabled: !sleeping,
  });

  return (
    <WidgetCard title="" status={status} error={error} onRetry={retry}>
      {data && (
        <div className="weather-widget">
          <div className="weather-widget__current">
            <span className="weather-widget__icon">
              {WEATHER_ICONS[data.icon] ?? "🌡️"}
            </span>
            <div className="weather-widget__current-info">
              <p className="weather-widget__location">{data.location}</p>
              <p className="weather-widget__temp">
                {data.temp}
                {unitSymbol}
              </p>
              <p className="weather-widget__desc">{data.description}</p>
            </div>
          </div>
          <div className="weather-widget__details">
            <div className="weather-widget__detail-card">
              <span className="weather-widget__detail-label">Feels</span>
              <span className="weather-widget__detail-value">
                {data.feelsLike}
                {unitSymbol}
              </span>
            </div>
            <div className="weather-widget__detail-card">
              <span className="weather-widget__detail-label">Humidity</span>
              <span className="weather-widget__detail-value">{data.humidity}%</span>
            </div>
            <div className="weather-widget__detail-card">
              <span className="weather-widget__detail-label">Wind</span>
              <span className="weather-widget__detail-value">
                {data.windSpeed} {units === "imperial" ? "mph" : "m/s"}
              </span>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
