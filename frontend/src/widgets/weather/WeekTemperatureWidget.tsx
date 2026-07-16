import { useWeeklyWeatherQuery } from "../../hooks/useWeeklyWeatherQuery";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";
import { WEATHER_ICONS } from "./icons";

export function WeatherWeeklyWidget({ instance, sleeping }: WidgetProps) {
  const location = (instance.config.location as string) ?? "Buenos Aires";
  const units = (instance.config.units as string) ?? "metric";
  const lang = (instance.config.lang as string) ?? "en";
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 600) * 1000;
  const unitSymbol = units === "imperial" ? "°F" : "°C";

  const { data, status, error, refetch } = useWeeklyWeatherQuery({
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
