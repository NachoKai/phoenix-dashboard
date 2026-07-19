import styled from "styled-components";
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
        <Wrapper>
          <LocationLabel>{data.location}</LocationLabel>
          <Grid>
            {data.forecast.map(f => (
              <Item key={f.time}>
                <Time>{f.time}</Time>
                <ItemIcon>
                  {WEATHER_ICONS[f.icon] ?? "·"}
                </ItemIcon>
                <ItemTemp>
                  {f.temp}
                  {unitSymbol}
                </ItemTemp>
                <ItemDesc>{f.description}</ItemDesc>
              </Item>
            ))}
          </Grid>
        </Wrapper>
      )}
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const LocationLabel = styled.div`
  font-size: clamp(0.6rem, 3.5cqw, 1rem);
  color: ${({ theme }) => theme.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  background: ${({ theme }) => theme.bgElevated};
  padding: 8px 4px;
`;

const Time = styled.span`
  font-size: clamp(0.6rem, 3.5cqw, 1rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ItemIcon = styled.span`
  font-size: clamp(1.1rem, 8cqw, 2.5rem);
  line-height: 1;
`;

const ItemTemp = styled.span`
  font-size: clamp(0.75rem, 5cqw, 1.4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.text};
`;

const ItemDesc = styled.span`
  font-size: clamp(0.5rem, 2.8cqw, 0.85rem);
  color: ${({ theme }) => theme.textMuted};
  text-transform: capitalize;
  text-align: center;
  line-height: 1.2;
`;
