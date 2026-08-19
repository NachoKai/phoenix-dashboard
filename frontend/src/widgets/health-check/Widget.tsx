import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { toWidgetStatus } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface DependencyCheck {
  name: string;
  configured: boolean;
  reachable?: boolean;
  latencyMs?: number;
  error?: string;
}

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  db: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  dependencies?: DependencyCheck[];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function depLabel(name: string): string {
  const labels: Record<string, string> = {
    database: "Database",
    openweathermap: "Weather API",
    giphy: "Giphy",
    openrouter: "OpenRouter",
    tuya: "Tuya IoT",
  };
  return labels[name] ?? name;
}

function depIcon(dep: DependencyCheck): string {
  if (!dep.configured) return "⚙️";
  if (dep.reachable) return "✅";
  return "❌";
}

export function HealthCheckWidget({ instance, sleeping }: WidgetProps) {
  const refreshInterval =
    ((instance.config.refreshInterval as number) ?? 30) * 1000;

  const [deepMode, setDeepMode] = useState(false);
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(
    async (signal?: AbortSignal) => {
      const endpoint = deepMode ? "/health/deep" : "/health";
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as HealthData;
        setData(body);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      }
    },
    [deepMode],
  );

  useEffect(() => {
    if (sleeping) return;

    let active = true;
    const controller = new AbortController();

    // Reset data when switching modes
    setData(null);
    setError(null);

    fetchHealth(controller.signal);
    const id = setInterval(() => {
      if (active) fetchHealth(controller.signal);
    }, refreshInterval);

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [fetchHealth, refreshInterval, sleeping]);

  const widgetStatus = toWidgetStatus(
    data ? "success" : error ? "error" : "pending",
    !!data,
  );

  return (
    <WidgetCard
      title="Server Health"
      status={widgetStatus}
      error={error}
      onRetry={() => {
        setError(null);
        setData(null);
      }}
    >
      {data && (
        <HealthGrid>
          <TopRow>
            <StatusRow>
              <StatusDot $ok={data.status === "ok"} />
              <StatusLabel>
                {data.status === "ok" ? "Healthy" : "Degraded"}
              </StatusLabel>
            </StatusRow>
            <VersionBadge>v{data.version}</VersionBadge>
          </TopRow>

          <Metric>
            <MetricLabel>Uptime</MetricLabel>
            <MetricValue>{formatUptime(data.uptime)}</MetricValue>
          </Metric>

          <Metric>
            <MetricLabel>Database</MetricLabel>
            <MetricValue $ok={data.db === "connected"}>
              {data.db === "connected" ? "Connected" : "Unreachable"}
            </MetricValue>
          </Metric>

          <Metric>
            <MetricLabel>Heap</MetricLabel>
            <MetricValue>
              {data.memory.heapUsed} / {data.memory.heapTotal} MB
            </MetricValue>
          </Metric>

          <Metric>
            <MetricLabel>RSS</MetricLabel>
            <MetricValue>{data.memory.rss} MB</MetricValue>
          </Metric>

          {data.dependencies && (
            <DepsSection>
              <DepsHeader>Dependencies</DepsHeader>
              {data.dependencies.map(dep => (
                <DepRow key={dep.name}>
                  <span>{depIcon(dep)}</span>
                  <DepName>{depLabel(dep.name)}</DepName>
                  <DepStatus $ok={dep.configured ? dep.reachable !== false : undefined}>
                    {!dep.configured
                      ? "Not configured"
                      : dep.reachable
                        ? `${dep.latencyMs}ms`
                        : dep.error ?? "Unreachable"}
                  </DepStatus>
                </DepRow>
              ))}
            </DepsSection>
          )}

          <BottomRow>
            <ToggleBtn
              type="button"
              $active={deepMode}
              onClick={() => setDeepMode(d => !d)}
            >
              {deepMode ? "Deep: ON" : "Deep: OFF"}
            </ToggleBtn>
            {lastUpdated && (
              <UpdatedText>
                {lastUpdated.toLocaleTimeString()}
              </UpdatedText>
            )}
          </BottomRow>
        </HealthGrid>
      )}
    </WidgetCard>
  );
}

const HealthGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 2px;
  width: 100%;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusDot = styled.span<{ $ok: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $ok, theme }) => ($ok ? theme.success : theme.error)};
  flex-shrink: 0;
`;

const StatusLabel = styled.span`
  font-size: clamp(0.7rem, 4cqw, 1.1rem);
  font-weight: 600;
`;

const VersionBadge = styled.span`
  margin-left: auto;
  font-size: clamp(0.5rem, 2.5cqw, 0.75rem);
  color: ${({ theme }) => theme.textMuted};
  background: ${({ theme }) => theme.bgElevated};
  padding: 1px 5px;
  border-radius: 4px;
`;

const Metric = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricLabel = styled.span`
  font-size: clamp(0.55rem, 3cqw, 0.85rem);
  color: ${({ theme }) => theme.textMuted};
`;

const MetricValue = styled.span<{ $ok?: boolean }>`
  font-size: clamp(0.6rem, 3.2cqw, 0.9rem);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ $ok, theme }) =>
    $ok === false ? theme.error : theme.text};
`;

const DepsSection = styled.div`
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DepsHeader = styled.span`
  font-size: clamp(0.5rem, 2.5cqw, 0.7rem);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.7;
  margin-bottom: 1px;
`;

const DepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: clamp(0.5rem, 2.8cqw, 0.8rem);
`;

const DepName = styled.span`
  font-weight: 500;
  min-width: 70px;
`;

const DepStatus = styled.span<{ $ok?: boolean }>`
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: ${({ $ok, theme }) =>
    $ok === false ? theme.error : $ok === true ? theme.success : theme.textMuted};
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  font-size: clamp(0.45rem, 2.2cqw, 0.65rem);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.accent : theme.bgElevated};
  color: ${({ $active, theme }) => ($active ? "#fff" : theme.textMuted)};
  border: 1px solid ${({ theme }) => theme.border};
  transition: background 0.15s, color 0.15s;
`;

const UpdatedText = styled.span`
  font-size: clamp(0.45rem, 2cqw, 0.65rem);
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.6;
`;
