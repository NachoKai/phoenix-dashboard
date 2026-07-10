import { useEffect, useState } from 'react';
import type { WidgetProps } from '../../types';

export function ClockWidget({ instance }: WidgetProps) {
  const format = (instance.config.format as string) ?? '24h';
  const timezone = (instance.config.timezone as string) ?? 'local';
  const showSeconds = (instance.config.showSeconds as boolean) ?? true;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), showSeconds ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [showSeconds]);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: format === '12h',
    timeZone: timezone === 'local' ? undefined : timezone,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone === 'local' ? undefined : timezone,
  };

  return (
    <article className="widget-card widget-card--success clock-widget-card">
      <div className="clock-widget">
        <time className="clock-widget__time" dateTime={now.toISOString()}>
          {now.toLocaleTimeString([], timeOptions)}
        </time>
        <p className="clock-widget__date">{now.toLocaleDateString([], dateOptions)}</p>
      </div>
    </article>
  );
}
