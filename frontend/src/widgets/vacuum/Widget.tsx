import styled, { keyframes } from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import { useVacuumQuery } from "../../hooks/useVacuumQuery";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";

function BatteryIcon({ level }: { level: number }) {
  let icon = "🪫";
  if (level > 80) icon = "🔋";
  else if (level > 50) icon = "🔋";
  else if (level > 20) icon = "🪫";
  else icon = "🪫";

  return <BatteryIconSpan>{icon}</BatteryIconSpan>;
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
        <Wrapper>
          <Top>
            <Battery>
              <BatteryIcon level={data.battery} />
              <BatteryLevel>{data.battery}%</BatteryLevel>
              <BatteryBar>
                <BatteryFill
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
              </BatteryBar>
            </Battery>
            <Status>
              <State $cleaning={data.isCleaning}>
                Status: {data.status}
              </State>
              {!data.online && <Offline>offline</Offline>}
            </Status>
          </Top>

          <Info>
            {data.area > 0 && (
              <Stat>{(data.area / 100).toFixed(0)} m²</Stat>
            )}
            {data.time > 0 && (
              <Stat>{data.time} min</Stat>
            )}
            {data.fanSpeed && (
              <Stat $fan>
                Fan Speed: {data.fanSpeed}
              </Stat>
            )}
          </Info>

          {data.errorCode > 0 && (
            <ErrorMsg>Error {data.errorCode}</ErrorMsg>
          )}

          <Controls>
            <ControlsRow>
              <Btn
                $primary
                $sending={isSending}
                disabled={isSending || data.isCleaning}
                onClick={() => handleControl("start")}
              >
                Start
              </Btn>
              <Btn
                disabled={isSending || !data.isCleaning}
                onClick={() => handleControl("pause")}
              >
                Pause
              </Btn>
              <Btn
                disabled={isSending}
                onClick={() => handleControl("stop")}
              >
                Stop
              </Btn>
            </ControlsRow>
            <ControlsRow>
              <Btn
                disabled={isSending}
                onClick={() => handleControl("power_on")}
                title="Turn on"
              >
                On
              </Btn>
              <Btn
                disabled={isSending}
                onClick={() => handleControl("power_off")}
                title="Turn off"
              >
                Off
              </Btn>
              <Btn
                disabled={isSending}
                onClick={() => handleControl("dock")}
                title="Return to dock"
              >
                Dock
              </Btn>
            </ControlsRow>
          </Controls>
        </Wrapper>
      )}
    </WidgetCard>
  );
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  flex: 1;
  min-height: 0;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Battery = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const BatteryIconSpan = styled.span`
  font-size: clamp(1.2rem, 7cqw, 1.8rem);
`;

const BatteryLevel = styled.span`
  font-size: clamp(0.75rem, 4.5cqw, 1.2rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const BatteryBar = styled.div`
  width: clamp(60px, 22cqw, 110px);
  height: clamp(8px, 2.5cqw, 12px);
  background: ${({ theme }) => theme.border};
  overflow: hidden;
`;

const BatteryFill = styled.div`
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const State = styled.span<{ $cleaning: boolean }>`
  font-size: clamp(0.75rem, 4.5cqw, 1.2rem);
  color: ${({ $cleaning, theme }) =>
    $cleaning ? theme.success : theme.textMuted};
  font-weight: 600;
`;

const Offline = styled.span`
  font-size: clamp(0.45rem, 2.5cqw, 0.7rem);
  color: ${({ theme }) => theme.error};
  text-transform: uppercase;
`;

const Info = styled.div`
  display: flex;
  gap: 18px;
`;

const Stat = styled.span<{ $fan?: boolean }>`
  font-size: clamp(0.6rem, 3.8cqw, 1rem);
  color: ${({ $fan, theme }) => ($fan ? theme.text : theme.textMuted)};
  font-weight: ${({ $fan }) => ($fan ? "600" : "400")};
  font-variant-numeric: tabular-nums;
`;

const ErrorMsg = styled.div`
  font-size: clamp(0.55rem, 3.2cqw, 0.85rem);
  color: ${({ theme }) => theme.error};
  font-weight: 600;
  text-align: center;
  padding: 2px 0;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 8px;
`;

const Btn = styled.button<{ $primary?: boolean; $sending?: boolean }>`
  flex: 1;
  padding: 8px 12px;
  background: ${({ $primary, theme }) =>
    $primary ? theme.accent : theme.bg};
  border: 1px solid
    ${({ $primary, theme }) => ($primary ? theme.accent : theme.border)};
  color: ${({ $primary, theme }) => ($primary ? "#fff" : theme.text)};
  cursor: pointer;
  font-size: clamp(0.6rem, 3.6cqw, 0.95rem);
  font-weight: 600;
  transition: all 0.2s ease;
  animation: ${({ $sending }) => ($sending ? pulse : "none")} 1s ease-in-out infinite;

  &:hover:not(:disabled) {
    background: ${({ $primary, theme }) =>
      $primary ? theme.accentDim : theme.bgElevated};
    border-color: ${({ theme }) => theme.accent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
