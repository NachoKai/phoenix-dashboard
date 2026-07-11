import { useCallback } from "react";
import { fetchWithRetry } from "../../api";
import { WidgetCard } from "../../components/WidgetCard";
import { useWidgetData } from "../../hooks/useWidgetData";
import type { WidgetProps } from "../../types";
import { WEATHER_ICONS } from "./icons";

interface DailyForecast {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  description: string;
}

interface WeeklyWeatherData {
  location: string;
  units: string;
  daily: DailyForecast[];
  cachedAt: string;
}

export function WeatherWeeklyWidget({ instance, sleeping }: WidgetProps) {
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
    return fetchWithRetry<WeeklyWeatherData>(`/api/weather-weekly?${params}`);
  }, [location, units, lang, instance.id]);

  const { data, status, error, retry } = useWidgetData<WeeklyWeatherData>({
    fetcher,
    refreshInterval,
    staleAfterMs: refreshInterval * 1.5,
    enabled: !sleeping,
  });

  return (
    <WidgetCard title="" status={status} error={error} onRetry={retry}>
      {data && data.daily.length > 0 && (
        <div className="weather-weekly-widget">
          <div className="weather-weekly-widget__location">{data.location}</div>
          <div className="weather-weekly-widget__grid">
            {data.daily.map(day => (
              <div key={day.date} className="weather-weekly-widget__item">
                <span className="weather-weekly-widget__day">{day.dayName}</span>
                <span className="weather-weekly-widget__icon">
                  {WEATHER_ICONS[day.icon] ?? "·"}
                </span>
                <div className="weather-weekly-widget__temps">
                  <span className="weather-weekly-widget__temp-min">
                    {day.tempMin}
                    {unitSymbol}
                  </span>
                  <span className="weather-weekly-widget__temp-sep">/</span>
                  <span className="weather-weekly-widget__temp-max">
                    {day.tempMax}
                    {unitSymbol}
                  </span>
                </div>
                <span className="weather-weekly-widget__desc">{day.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
