import { useCallback, useState } from "react";
import { fetchWithRetry } from "../../api";
import { WidgetCard } from "../../components/WidgetCard";
import { useWidgetData } from "../../hooks/useWidgetData";
import type { WidgetProps } from "../../types";

interface LightDevice {
  id: string;
  name: string;
  online: boolean;
  isOn: boolean;
  brightness: number;
  colorTemp: number;
  color: string;
  colorMode: string;
}

const COLOR_PRESETS = [
  { label: "Daylight", temp: 1000, bg: "#e8f0ff" },
  { label: "Cool", temp: 750, bg: "#fff8e1" },
  { label: "Neutral", temp: 500, bg: "#ffecd2" },
  { label: "Warm", temp: 250, bg: "#ffc48a" },
  { label: "Candle", temp: 100, bg: "#ff9d4a" },
];

export function LightsWidget({ instance, sleeping }: WidgetProps) {
  const refreshInterval = ((instance.config.refreshInterval as number) ?? 30) * 1000;

  const fetcher = useCallback(() => {
    return fetchWithRetry<LightDevice[] | LightDevice>("/api/lights/devices");
  }, []);

  const { data, status, error, retry } = useWidgetData<LightDevice[] | LightDevice>({
    fetcher,
    refreshInterval,
    staleAfterMs: refreshInterval * 2,
    enabled: !sleeping,
  });

  const [sending, setSending] = useState<string | null>(null);

  const lights = Array.isArray(data) ? data : data ? [data] : [];

  async function sendControl(deviceId: string, action: string, value?: unknown) {
    setSending(`${deviceId}:${action}`);
    try {
      await fetchWithRetry("/api/lights/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action, value }),
      });
      retry();
    } finally {
      setSending(null);
    }
  }

  return (
    <WidgetCard title="Lights" status={status} error={error} onRetry={retry}>
      <div className="lights-widget">
        {lights.length === 0 && <p className="lights-widget__empty">No lights found</p>}
        {lights.map(light => {
          const busy = sending?.startsWith(light.id);
          return (
            <div key={light.id} className="lights-widget__light">
              <div className="lights-widget__row">
                <button
                  type="button"
                  className={`lights-widget__toggle ${light.isOn ? "lights-widget__toggle--on" : ""}`}
                  disabled={busy || !light.online}
                  onClick={() => sendControl(light.id, "toggle", !light.isOn)}
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
                    <span className="lights-widget__label">BRI</span>
                    <button
                      type="button"
                      className="lights-widget__adj-btn lights-widget__adj-btn--wide"
                      disabled={busy || light.brightness <= 10}
                      onClick={() => sendControl(light.id, "brightness", 10)}
                    >
                      MIN
                    </button>
                    <button
                      type="button"
                      className="lights-widget__adj-btn"
                      disabled={busy || light.brightness <= 1}
                      onClick={() =>
                        sendControl(
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
                        sendControl(
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
                      onClick={() => sendControl(light.id, "brightness", 100)}
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
                      onChange={e => sendControl(light.id, "color", e.target.value)}
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
                        onClick={() => sendControl(light.id, "color_temp", preset.temp)}
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
