import type { ReactNode } from "react";import type { WidgetStatus } from "../types";

interface WidgetCardProps {
  title: string;
  status: WidgetStatus;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

export function WidgetCard({ title, status, error, onRetry, children }: WidgetCardProps) {
  return (
    <article className={`widget-card widget-card--${status}`}>
      <header className="widget-card__header">
        <h2 className="widget-card__title">{title}</h2>
      </header>

      <div className="widget-card__body">
        {status === "loading" && !children ? (
          <div className="widget-card__loading">Loading…</div>
        ) : status === "error" && !children ? (
          <div className="widget-card__error">
            <p>{error ?? "Something went wrong"}</p>
            {onRetry && (
              <button type="button" className="widget-card__retry" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        ) : (
          children
        )}
        {status === "error" && children && (
          <div className="widget-card__stale-banner">{error}</div>
        )}
      </div>
    </article>
  );
}
