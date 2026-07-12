import { useCallback, useState } from "react";
import { fetchWithRetry } from "../../api";
import { WidgetCard } from "../../components/WidgetCard";
import { useWidgetData } from "../../hooks/useWidgetData";
import type { WidgetProps } from "../../types";

interface VacuumData {
  id: string;
  name: string;
  online: boolean;
  isOn: boolean;
  isCleaning: boolean;
  battery: number;
  status: string;
  fanSpeed: string;
  area: number;
  time: number;
  errorCode: number;
}

function BatteryIcon({ level }: { level: number }) {
  let icon = "🪫";
  if (level > 80) icon = "🔋";
  else if (level > 50) icon = "🔋";
  else if (level > 20) icon = "🪫";
  else icon = "🪫";

  return <span className="vacuum-widget__battery-icon">{icon}</span>;
}

export function VacuumWidget({ instance, sleeping }: WidgetProps) {
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 15) * 1000;

  const fetcher = useCallback(() => {
    return fetchWithRetry<VacuumData>("/api/vacuum/status");
  }, []);

  const { data, status, error, retry } = useWidgetData<VacuumData>({
    fetcher,
    refreshInterval,
    staleAfterMs: refreshInterval * 3,
    enabled: !sleeping,
  });

  const [sending, setSending] = useState<string | null>(null);

  async function sendControl(action: string) {
    if (!data) return;
    setSending(action);
    try {
      await fetchWithRetry("/api/vacuum/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: data.id, action }),
      });
      retry();
    } finally {
      setSending(null);
    }
  }

  return (
    <WidgetCard title="Robot Vacuum" status={status} error={error} onRetry={retry}>
      {data && (
        <div className="vacuum-widget">
          <div className="vacuum-widget__top">
            <div className="vacuum-widget__battery">
              <BatteryIcon level={data.battery} />
              <span className="vacuum-widget__battery-level">{data.battery}%</span>
              <div className="vacuum-widget__battery-bar">
                <div
                  className="vacuum-widget__battery-fill"
                  style={{
                    width: `${data.battery}%`,
                    background:
                      data.battery > 50
                        ? "var(--success)"
                        : data.battery > 20
                          ? "var(--warning)"
                          : "var(--error)",
                  }}
                />
              </div>
            </div>
            <div className="vacuum-widget__status">
              <span
                className={`vacuum-widget__state ${data.isCleaning ? "vacuum-widget__state--cleaning" : ""}`}
              >
                {data.status}
              </span>
              {!data.online && <span className="vacuum-widget__offline">offline</span>}
            </div>
          </div>

          <div className="vacuum-widget__info">
            {data.area > 0 && (
              <span className="vacuum-widget__stat">
                {(data.area / 100).toFixed(0)} m²
              </span>
            )}
            {data.time > 0 && (
              <span className="vacuum-widget__stat">{data.time} min</span>
            )}
          </div>

          <div className="vacuum-widget__controls">
            <button
              type="button"
              className="vacuum-widget__btn"
              disabled={!!sending}
              onClick={() => sendControl("power_on")}
              title="Turn on"
            >
              ⏻ On
            </button>
            <button
              type="button"
              className="vacuum-widget__btn"
              disabled={!!sending}
              onClick={() => sendControl("power_off")}
              title="Turn off"
            >
              ⏻ Off
            </button>
            <button
              type="button"
              className={`vacuum-widget__btn vacuum-widget__btn--primary ${sending === "start" ? "vacuum-widget__btn--sending" : ""}`}
              disabled={!!sending || data.isCleaning}
              onClick={() => sendControl("start")}
            >
              Start
            </button>
            <button
              type="button"
              className="vacuum-widget__btn"
              disabled={!!sending}
              onClick={() => sendControl("stop")}
            >
              Stop
            </button>
            <button
              type="button"
              className="vacuum-widget__btn"
              disabled={!!sending}
              onClick={() => sendControl("dock")}
              title="Return to dock"
            >
              Dock
            </button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
