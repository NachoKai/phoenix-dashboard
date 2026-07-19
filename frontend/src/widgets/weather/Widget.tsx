import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import { useWeatherQuery } from "../../hooks/useWeatherQuery";
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
        <CenteringWrapper>
          <InnerRow>
            <Current>
              <Icon>
                {WEATHER_ICONS[data.icon] ?? "🌡️"}
              </Icon>
              <CurrentInfo>
                <Location>{data.location}</Location>
                <Temp>
                  {data.temp}
                  {unitSymbol}
                </Temp>
                <Desc>{data.description}</Desc>
              </CurrentInfo>
            </Current>
            <Details>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "feels")}</DetailLabel>
                </DetailHeader>
                <DetailValue>
                  {data.feelsLike}
                  {unitSymbol}
                </DetailValue>
              </DetailCard>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "humidity")}</DetailLabel>
                </DetailHeader>
                <DetailValue>{data.humidity}%</DetailValue>
              </DetailCard>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "wind")}</DetailLabel>
                </DetailHeader>
                <DetailValue>
                  {data.windSpeed} {units === "imperial" ? "mph" : "m/s"}
                </DetailValue>
              </DetailCard>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "sunrise")}</DetailLabel>
                </DetailHeader>
                <DetailValue>
                  {formatTime(data.sunrise)}
                </DetailValue>
              </DetailCard>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "sunset")}</DetailLabel>
                </DetailHeader>
                <DetailValue>
                  {formatTime(data.sunset)}
                </DetailValue>
              </DetailCard>
              <DetailCard>
                <DetailHeader>
                  <DetailLabel>{getLabel(lang, "aqi")}</DetailLabel>
                </DetailHeader>
                <DetailValue style={{ color: AQI_COLORS[data.aqi] }}>
                  {data.aqiLabel}
                </DetailValue>
              </DetailCard>
            </Details>
          </InnerRow>
        </CenteringWrapper>
      )}
    </WidgetCard>
  );
}

const CenteringWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InnerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Current = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Icon = styled.span`
  font-size: clamp(1.6rem, 12cqw, 3.5rem);
  line-height: 1;
  flex-shrink: 0;
`;

const CurrentInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Location = styled.p`
  margin: 0;
  font-size: clamp(0.65rem, 3.5cqw, 1.05rem);
  color: ${({ theme }) => theme.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Temp = styled.p`
  margin: 1px 0 0;
  font-size: clamp(1.2rem, 10cqw, 3rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`;

const Desc = styled.p`
  margin: 1px 0 0;
  text-transform: capitalize;
  color: ${({ theme }) => theme.textMuted};
  font-size: clamp(0.6rem, 3.2cqw, 1rem);
`;

const Details = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-left: auto;
`;

const DetailCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
  gap: 2px;
  color: ${({ theme }) => theme.textMuted};
  text-align: center;
  min-width: 0;
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: center;
`;

const DetailLabel = styled.span`
  font-size: clamp(0.6rem, 3.5cqw, 1.05rem);
  font-weight: 500;
  opacity: 0.7;
`;

const DetailValue = styled.span`
  font-size: clamp(0.8rem, 5cqw, 1.4rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.text};
`;
