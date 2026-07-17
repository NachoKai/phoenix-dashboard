import { useLightsQuery } from "../../hooks/useLightsQuery";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";
import { COLOR_PRESETS } from "../../constants";

export function LightsWidget({ instance, sleeping }: WidgetProps) {
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 30) * 1000;

  const {
    data: lights,
    status,
    error,
    refetch,
    sendControl,
    isSending,
  } = useLightsQuery({
    refreshInterval,
    enabled: !sleeping,
  });

  const widgetStatus = toWidgetStatus(status, lights.length > 0);

  async function handleControl(deviceId: string, action: string, value?: unknown) {
    try {
      await sendControl(deviceId, action, value);
    } catch {
      console.error("[lights] Failed to send control");
      // error handled by mutation
    }
  }

  return (
    <WidgetCard
      title="Lights"
      status={widgetStatus}
      error={error?.message ?? null}
      onRetry={() => refetch()}
    >
      <div className="lights-widget">
        {lights.length === 0 && <p className="lights-widget__empty">No lights found</p>}
        {lights.map(light => {
          const busy = isSending;
          return (
            <div key={light.id} className="lights-widget__light">
              <div className="lights-widget__row">
                <button
                  type="button"
                  className={`lights-widget__toggle ${light.isOn ? "lights-widget__toggle--on" : ""}`}
                  disabled={busy || !light.online}
                  onClick={() => handleControl(light.id, "toggle", !light.isOn)}
                >
                  {light.isOn ? "ON" : "OFF"}
                </button>
                <span className="lights-widget__name" title={light.name || light.id}>
                  {light.name || "Light"}
                </span>
                {!light.online && <span className="lights-widget__offline">offline</span>}
              </div>
              {light.isOn && (
                <div className="lights-widget__controls">
                  <div className="lights-widget__row">
                    <span className="lights-widget__label">BRIGHT</span>
                    <button
                      type="button"
                      className="lights-widget__adj-btn lights-widget__adj-btn--wide"
                      disabled={busy || light.brightness <= 10}
                      onClick={() => handleControl(light.id, "brightness", 10)}
                    >
                      MIN
                    </button>
                    <button
                      type="button"
                      className="lights-widget__adj-btn"
                      disabled={busy || light.brightness <= 1}
                      onClick={() =>
                        handleControl(
                          light.id,
                          "brightness",
                          Math.max(1, light.brightness - 10),
                        )
                      }
                    >
                      −
                    </button>
                    <span className="lights-widget__value">{light.brightness}%</span>
                    <button
                      type="button"
                      className="lights-widget__adj-btn"
                      disabled={busy || light.brightness >= 100}
                      onClick={() =>
                        handleControl(
                          light.id,
                          "brightness",
                          Math.min(100, light.brightness + 10),
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="lights-widget__adj-btn lights-widget__adj-btn--wide"
                      disabled={busy || light.brightness === 100}
                      onClick={() => handleControl(light.id, "brightness", 100)}
                    >
                      MAX
                    </button>
                  </div>
                  <div className="lights-widget__row">
                    <span className="lights-widget__label">CLR</span>
                    <input
                      type="color"
                      value={light.color}
                      className="lights-widget__color"
                      disabled={busy}
                      onChange={e => handleControl(light.id, "color", e.target.value)}
                    />
                  </div>
                  <div className="lights-widget__presets">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`lights-widget__preset ${light.colorTemp === preset.temp ? "lights-widget__preset--active" : ""}`}
                        disabled={busy}
                        title={preset.label}
                        style={{ background: preset.bg }}
                        onClick={() => handleControl(light.id, "color_temp", preset.temp)}
                      >
                        <span className="lights-widget__preset-label">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
