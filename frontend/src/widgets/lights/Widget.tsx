import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import { COLOR_PRESETS } from "../../constants";
import { useLightsQuery } from "../../hooks/useLightsQuery";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";

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
      <Wrapper>
        {lights.length === 0 && <Empty>No lights found</Empty>}
        {lights.map(light => {
          const busy = isSending;
          return (
            <Light key={light.id}>
              <Row>
                <Toggle
                  $on={light.isOn}
                  disabled={busy || !light.online}
                  onClick={() => handleControl(light.id, "toggle", !light.isOn)}
                >
                  {light.isOn ? "ON" : "OFF"}
                </Toggle>
                <Name title={light.name || light.id}>{light.name || "Light"}</Name>
                {!light.online && <Offline>offline</Offline>}
              </Row>
              {light.isOn && (
                <Controls>
                  <Row>
                    <Label>BRIGHT</Label>
                    <AdjBtn
                      $wide
                      disabled={busy || light.brightness <= 10}
                      onClick={() => handleControl(light.id, "brightness", 10)}
                    >
                      MIN
                    </AdjBtn>
                    <AdjBtn
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
                    </AdjBtn>
                    <Value>{light.brightness}%</Value>
                    <AdjBtn
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
                    </AdjBtn>
                    <AdjBtn
                      $wide
                      disabled={busy || light.brightness === 100}
                      onClick={() => handleControl(light.id, "brightness", 100)}
                    >
                      MAX
                    </AdjBtn>
                  </Row>
                  <Row>
                    <Label>CLR</Label>
                    <ColorInput
                      type="color"
                      value={light.color}
                      disabled={busy}
                      onChange={e => handleControl(light.id, "color", e.target.value)}
                    />
                  </Row>
                  <Presets>
                    {COLOR_PRESETS.map(preset => (
                      <PresetBtn
                        key={preset.label}
                        $active={light.colorTemp === preset.temp}
                        disabled={busy}
                        title={preset.label}
                        style={{ background: preset.bg }}
                        onClick={() => handleControl(light.id, "color_temp", preset.temp)}
                      >
                        <PresetLabel>{preset.label}</PresetLabel>
                      </PresetBtn>
                    ))}
                  </Presets>
                </Controls>
              )}
            </Light>
          );
        })}
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  flex: 1;
  min-height: 0;
`;

const Empty = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.textMuted};
  font-size: clamp(0.6rem, 3.5cqw, 0.9rem);
  padding: 4px 0;
`;

const Light = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Toggle = styled.button<{ $on: boolean }>`
  padding: 4px 12px;
  background: ${({ $on, theme }) => ($on ? theme.accent : theme.bg)};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.accent : theme.border)};
  color: ${({ $on, theme }) => ($on ? "#fff" : theme.textMuted)};
  cursor: pointer;
  font-size: clamp(0.6rem, 3.6cqw, 0.95rem);
  font-weight: 600;
  min-width: 50px;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Name = styled.span`
  font-size: clamp(0.65rem, 4cqw, 1.05rem);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
`;

const Offline = styled.span`
  font-size: clamp(0.45rem, 2.5cqw, 0.7rem);
  color: ${({ theme }) => theme.error};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
`;

const Label = styled.span`
  font-size: clamp(0.55rem, 3.2cqw, 0.85rem);
  color: ${({ theme }) => theme.textMuted};
  font-weight: 600;
  letter-spacing: 0.05em;
  min-width: 0;
`;

const AdjBtn = styled.button<{ $wide?: boolean }>`
  width: ${({ $wide }) => ($wide ? "auto" : "clamp(30px, 8.5cqw, 40px)")};
  height: clamp(30px, 8.5cqw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  font-size: clamp(0.75rem, 4cqw, 1.1rem);
  font-weight: 700;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.15s ease;
  -webkit-user-select: none;
  user-select: none;
  flex-shrink: 0;
  min-width: ${({ $wide }) => ($wide ? "clamp(40px, 11cqw, 52px)" : "0")};
  font-size: ${({ $wide }) =>
    $wide ? "clamp(0.55rem, 3cqw, 0.8rem)" : "clamp(0.75rem, 4cqw, 1.1rem)"};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.accent};
    border-color: ${({ theme }) => theme.accent};
    color: #fff;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const Value = styled.span`
  font-weight: 700;
  font-size: clamp(0.75rem, 4.5cqw, 1.2rem);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

const ColorInput = styled.input`
  width: clamp(32px, 9cqw, 42px);
  height: clamp(26px, 7cqw, 34px);
  border: 1px solid ${({ theme }) => theme.border};
  padding: 0;
  cursor: pointer;
  background: transparent;
`;

const Presets = styled.div`
  display: flex;
  gap: 4px;
`;

const PresetBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  height: clamp(28px, 7.5cqw, 38px);
  border: 1px solid ${({ $active, theme }) => ($active ? theme.accent : "transparent")};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
  min-width: 0;
  box-shadow: ${({ $active, theme }) => ($active ? `0 0 6px ${theme.accent}66` : "none")};

  &:hover {
    border-color: ${({ theme }) => theme.textMuted};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PresetLabel = styled.span`
  font-size: clamp(0.46rem, 2.8cqw, 0.8rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1a1a2e;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
  line-height: 1;
  pointer-events: none;
`;
