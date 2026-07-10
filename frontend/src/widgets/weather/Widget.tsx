import { useCallback } from 'react';
import { fetchWithRetry } from '../../api';
import { WidgetCard } from '../../components/WidgetCard';
import { useWidgetData } from '../../hooks/useWidgetData';
import type { WidgetProps } from '../../types';

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
  '01d': '☀️',
  '01n': '🌙',
  '02d': '⛅',
  '02n': '☁️',
  '03d': '☁️',
  '03n': '☁️',
  '04d': '☁️',
  '04n': '☁️',
  '09d': '🌧️',
  '09n': '🌧️',
  '10d': '🌦️',
  '10n': '🌧️',
  '11d': '⛈️',
  '11n': '⛈️',
  '13d': '❄️',
  '13n': '❄️',
  '50d': '🌫️',
  '50n': '🌫️',
};

export function WeatherWidget({ instance }: WidgetProps) {
  const location = (instance.config.location as string) ?? 'London';
  const units = (instance.config.units as string) ?? 'metric';
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 600) * 1000;
  const unitSymbol = units === 'imperial' ? '°F' : '°C';

  const fetcher = useCallback(async () => {
    const params = new URLSearchParams({
      location,
      units,
      widgetId: instance.id,
    });
    return fetchWithRetry<WeatherData>(`/api/weather?${params}`);
  }, [location, units, instance.id]);

  const { data, status, error, lastUpdated, retry } = useWidgetData<WeatherData>({
    fetcher,
    refreshInterval,
    staleAfterMs: refreshInterval * 1.5,
  });

  return (
    <WidgetCard
      title="Weather"
      status={status}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={retry}
    >
      {data && (
        <div className="weather-widget">
          <div className="weather-widget__current">
            <span className="weather-widget__icon">
              {WEATHER_ICONS[data.icon] ?? '🌡️'}
            </span>
            <div>
              <p className="weather-widget__location">{data.location}</p>
              <p className="weather-widget__temp">
                {data.temp}
                {unitSymbol}
              </p>
              <p className="weather-widget__desc">{data.description}</p>
            </div>
          </div>
          <div className="weather-widget__details">
            <span>Feels {data.feelsLike}{unitSymbol}</span>
            <span>Humidity {data.humidity}%</span>
            <span>Wind {data.windSpeed} {units === 'imperial' ? 'mph' : 'm/s'}</span>
          </div>
          {data.forecast.length > 0 && (
            <div className="weather-widget__forecast">
              {data.forecast.map((f) => (
                <div key={f.time} className="weather-widget__forecast-item">
                  <span>{f.time}</span>
                  <span>{WEATHER_ICONS[f.icon] ?? '·'}</span>
                  <span>
                    {f.temp}
                    {unitSymbol}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
