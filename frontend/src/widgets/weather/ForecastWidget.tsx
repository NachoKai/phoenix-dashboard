import { WidgetCard } from "../../components/WidgetCard";
import { useWeatherQuery } from "../../hooks/useWeatherQuery";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";
import { WEATHER_ICONS } from "./icons";

export function WeatherForecastWidget({ instance, sleeping }: WidgetProps) {
  const location = (instance.config.location as string) ?? "Buenos Aires";
  const units = (instance.config.units as string) ?? "metric";
  const lang = (instance.config.lang as string) ?? "en";
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 600) * 1000;
  const unitSymbol = units === "imperial" ? "°F" : "°C";

  const { data, status, error, refetch } = useWeatherQuery({
    location,
    units,
    lang,
    widgetId: instance.id,
    refreshInterval,
    enabled: !sleeping,
  });

  const widgetStatus = toWidgetStatus(status, !!data);

  return (
    <WidgetCard
      title=""
      status={widgetStatus}
      error={error?.message ?? null}
      onRetry={() => refetch()}
    >
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
                  {f.temp}
                  {unitSymbol}
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
