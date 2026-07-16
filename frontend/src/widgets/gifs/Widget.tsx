import { useEffect, useState } from "react";
import { useGifsQuery } from "../../hooks/useGifsQuery";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";

export function GifsWidget({ instance, sleeping }: WidgetProps) {
  const source = (instance.config.source as string) ?? "static";
  const urls = (instance.config.urls as string[]) ?? [];
  const tag = (instance.config.tag as string) ?? "nature";
  const rotationInterval = ((instance.config.rotationInterval as number) ?? 30) * 1000;

  const { data, status, error, refetch } = useGifsQuery({
    source,
    widgetId: instance.id,
    tag,
    urls,
    refreshInterval: source === "giphy" ? 30 * 60_000 : 0,
    enabled: !sleeping,
  });

  const gifUrls = data?.urls ?? [];
  const [index, setIndex] = useState(() => 0);

  useEffect(() => {
    if (gifUrls.length > 0) {
      setIndex(Math.floor(Math.random() * gifUrls.length));
    }
  }, [gifUrls.length]);

  useEffect(() => {
    if (gifUrls.length <= 1) return;
    const id = setInterval(() => {
      setIndex(i => {
        if (gifUrls.length <= 1) return 0;
        let next;
        do {
          next = Math.floor(Math.random() * gifUrls.length);
        } while (next === i && gifUrls.length > 1);
        return next;
      });
    }, rotationInterval);
    return () => clearInterval(id);
  }, [gifUrls.length, rotationInterval]);

  const effectiveStatus =
    gifUrls.length === 0 && status === "success"
      ? "error"
      : toWidgetStatus(status, gifUrls.length > 0);
  const effectiveError =
    gifUrls.length === 0 ? "No GIFs configured" : (error?.message ?? null);

  return (
    <WidgetCard
      title=""
      status={effectiveStatus}
      error={effectiveError}
      onRetry={() => refetch()}
    >
      {gifUrls.length > 0 && (
        <div className="gifs-widget">
          <img
            key={gifUrls[index]}
            src={gifUrls[index]}
            alt="Animated GIF"
            className="gifs-widget__image"
            loading="lazy"
          />
        </div>
      )}
    </WidgetCard>
  );
}
