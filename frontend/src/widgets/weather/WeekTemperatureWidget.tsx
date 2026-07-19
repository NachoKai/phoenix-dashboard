import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import { useWeeklyWeatherQuery } from "../../hooks/useWeeklyWeatherQuery";
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
        <Wrapper>
          <LocationLabel>{data.location}</LocationLabel>
          <Grid>
            {data.daily.map(day => (
              <Item key={day.date}>
                <DayName>{day.dayName}</DayName>
                <ItemIcon>
                  {WEATHER_ICONS[day.icon] ?? "·"}
                </ItemIcon>
                <Temps>
                  <TempMin>
                    {day.tempMin}
                    {unitSymbol}
                  </TempMin>
                  <TempSep>/</TempSep>
                  <TempMax>
                    {day.tempMax}
                    {unitSymbol}
                  </TempMax>
                </Temps>
                <ItemDesc>{day.description}</ItemDesc>
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

const DayName = styled.span`
  font-size: clamp(0.6rem, 3.5cqw, 1rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ItemIcon = styled.span`
  font-size: clamp(1.1rem, 8cqw, 2.5rem);
  line-height: 1;
`;

const Temps = styled.div`
  display: flex;
  gap: 4px;
  align-items: baseline;
`;

const TempMin = styled.span`
  font-size: clamp(0.6rem, 4cqw, 1.1rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.text};
`;

const TempSep = styled.span`
  font-size: clamp(0.6rem, 4cqw, 1.1rem);
  font-weight: 700;
  color: ${({ theme }) => theme.textMuted};
`;

const TempMax = styled.span`
  font-size: clamp(0.6rem, 4cqw, 1.1rem);
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
