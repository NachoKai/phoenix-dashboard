import type { ReactNode } from 'react';
import type { WidgetStatus } from '../types';

interface WidgetCardProps {
  title: string;
  status: WidgetStatus;
  error: string | null;
  lastUpdated: Date | null;
  onRetry?: () => void;
  children: ReactNode;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WidgetCard({
  title,
  status,
  error,
  lastUpdated,
  onRetry,
  children,
}: WidgetCardProps) {
  return (
    <article className={`widget-card widget-card--${status}`}>
      <header className="widget-card__header">
        <h2 className="widget-card__title">{title}</h2>
        {lastUpdated && (
          <span className="widget-card__updated" title={lastUpdated.toISOString()}>
            {formatTime(lastUpdated)}
          </span>
        )}
      </header>

      <div className="widget-card__body">
        {status === 'loading' && !children ? (
          <div className="widget-card__loading">Loading…</div>
        ) : status === 'error' && !children ? (
          <div className="widget-card__error">
            <p>{error ?? 'Something went wrong'}</p>
            {onRetry && (
              <button type="button" className="widget-card__retry" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        ) : (
          children
        )}
        {status === 'stale' && (
          <div className="widget-card__stale-banner">Showing cached data</div>
        )}
        {status === 'error' && children && (
          <div className="widget-card__stale-banner">{error}</div>
        )}
      </div>
    </article>
  );
}
