import { useEffect, useState } from "react";
import styled from "styled-components";
import type { WidgetProps } from "../../types";

export function ClockWidget({ instance }: WidgetProps) {
  const format = (instance.config.format as string) ?? "24h";
  const timezone = (instance.config.timezone as string) ?? "local";
  const showSeconds = (instance.config.showSeconds as boolean) ?? true;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), showSeconds ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [showSeconds]);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: format === "12h",
    timeZone: timezone === "local" ? undefined : timezone,
  };

  const tz = timezone === "local" ? undefined : timezone;
  const weekday = now.toLocaleDateString([], { weekday: "long", timeZone: tz });
  const dateStr = now.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: tz });

  return (
    <Card>
      <Clock>
        <Time dateTime={now.toISOString()}>
          {now.toLocaleTimeString([], timeOptions)}
        </Time>
        <DateInfo>
          <span>{weekday}</span>
          <span>{dateStr}</span>
        </DateInfo>
      </Clock>
    </Card>
  );
}

const Card = styled.article`
  text-align: center;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  container-type: inline-size;
`;

const Clock = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Time = styled.time`
  display: block;
  font-size: clamp(1.4rem, 20cqw, 5rem);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.15;
  white-space: nowrap;
`;

const DateInfo = styled.div`
  margin: 0;
  font-size: clamp(0.7rem, 6cqw, 1.6rem);
  color: ${({ theme }) => theme.text};
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  gap: 1px;

  span:last-child {
    font-variant-numeric: tabular-nums;
  }
`;
