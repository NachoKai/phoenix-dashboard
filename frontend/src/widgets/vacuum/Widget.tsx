import { useVacuumQuery } from "../../hooks/useVacuumQuery";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";

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

  const { data, status, error, refetch, sendControl, isSending } = useVacuumQuery({
    refreshInterval,
    enabled: !sleeping,
  });

  const widgetStatus = toWidgetStatus(status, !!data);

  async function handleControl(action: string) {
    try {
      await sendControl(action);
    } catch {
      console.error("[vacuum] Failed to send control");
      // error handled by mutation
    }
  }

  return (
    <WidgetCard
      title="Robot Vacuum"
      status={widgetStatus}
      error={error?.message ?? null}
      onRetry={() => refetch()}
    >
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
                Status: {data.status}
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
            {data.fanSpeed && (
              <span className="vacuum-widget__stat vacuum-widget__stat--fan">
                Fan Speed: {data.fanSpeed}
              </span>
            )}
          </div>

          {data.errorCode > 0 && (
            <div className="vacuum-widget__error">Error {data.errorCode}</div>
          )}

          <div className="vacuum-widget__controls vacuum-widget__controls--rows">
            <div className="vacuum-widget__controls-row">
              <button
                type="button"
                className={`vacuum-widget__btn vacuum-widget__btn--primary ${isSending ? "vacuum-widget__btn--sending" : ""}`}
                disabled={isSending || data.isCleaning}
                onClick={() => handleControl("start")}
              >
                Start
              </button>
              <button
                type="button"
                className="vacuum-widget__btn"
                disabled={isSending || !data.isCleaning}
                onClick={() => handleControl("pause")}
              >
                Pause
              </button>
              <button
                type="button"
                className="vacuum-widget__btn"
                disabled={isSending}
                onClick={() => handleControl("stop")}
              >
                Stop
              </button>
            </div>
            <div className="vacuum-widget__controls-row">
              <button
                type="button"
                className="vacuum-widget__btn"
                disabled={isSending}
                onClick={() => handleControl("power_on")}
                title="Turn on"
              >
                On
              </button>
              <button
                type="button"
                className="vacuum-widget__btn"
                disabled={isSending}
                onClick={() => handleControl("power_off")}
                title="Turn off"
              >
                Off
              </button>
              <button
                type="button"
                className="vacuum-widget__btn"
                disabled={isSending}
                onClick={() => handleControl("dock")}
                title="Return to dock"
              >
                Dock
              </button>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
