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

export function WeatherForecastWidget({ instance }: WidgetProps) {
  const location = (instance.config.location as string) ?? "London";
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
  });

  return (
    <WidgetCard title="" status={status} error={error} onRetry={retry}>
      {data && data.forecast.length > 0 && (
        <div className="weather-forecast-widget">
          <div className="weather-forecast-widget__location">{data.location}</div>
          <div className="weather-forecast-widget__grid">
            {data.forecast.map(f => (
              <div key={f.time} className="weather-forecast-widget__item">
                <span className="weather-forecast-widget__time">{f.time}</span>
                <span className="weather-forecast-widget__icon">
                  {WEATHER_ICONS[f.icon] ?? "·"}
                </span>
                <span className="weather-forecast-widget__temp">
                  {f.temp}{unitSymbol}
                </span>
                <span className="weather-forecast-widget__desc">{f.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
