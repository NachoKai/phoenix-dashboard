import { useWeatherQuery } from "../../hooks/useWeatherQuery";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";
import { AQI_COLORS, formatTime, getLabel } from "../../utils/weather";
import { WEATHER_ICONS } from "./icons";

export function WeatherWidget({ instance, sleeping }: WidgetProps) {
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
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "feels")}
                </span>
              </div>
              <span className="weather-widget__detail-value">
                {data.feelsLike}
                {unitSymbol}
              </span>
            </div>
            <div className="weather-widget__detail-card">
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "humidity")}
                </span>
              </div>
              <span className="weather-widget__detail-value">{data.humidity}%</span>
            </div>
            <div className="weather-widget__detail-card">
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "wind")}
                </span>
              </div>
              <span className="weather-widget__detail-value">
                {data.windSpeed} {units === "imperial" ? "mph" : "m/s"}
              </span>
            </div>
            <div className="weather-widget__detail-card">
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "sunrise")}
                </span>
              </div>
              <span className="weather-widget__detail-value">
                {formatTime(data.sunrise)}
              </span>
            </div>
            <div className="weather-widget__detail-card">
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "sunset")}
                </span>
              </div>
              <span className="weather-widget__detail-value">
                {formatTime(data.sunset)}
              </span>
            </div>
            <div className="weather-widget__detail-card">
              <div className="weather-widget__detail-header">
                <span className="weather-widget__detail-label">
                  {getLabel(lang, "aqi")}
                </span>
              </div>
              <span
                className="weather-widget__detail-value"
                style={{ color: AQI_COLORS[data.aqi] }}
              >
                {data.aqiLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
