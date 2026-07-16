import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface LightDevice {
  id: string;
  name: string;
  online: boolean;
  isOn: boolean;
  brightness: number;
  colorTemp: number;
  color: string;
  colorMode: string;
}

async function fetchLights(): Promise<LightDevice[]> {
  const res = await fetch(`${API_BASE}/lights/devices`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data ? [data] : [];
}

async function sendLightControl(
  deviceId: string,
  action: string,
  value?: unknown,
): Promise<void> {
  const res = await fetch(`${API_BASE}/lights/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, action, value }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export function useLightsQuery({
  refreshInterval,
  enabled = true,
}: {
  refreshInterval: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lights"],
    queryFn: fetchLights,
    refetchInterval: enabled ? refreshInterval : false,
    staleTime: refreshInterval * 2,
    enabled,
  });

  const controlMutation = useMutation({
    mutationFn: ({
      deviceId,
      action,
      value,
    }: {
      deviceId: string;
      action: string;
      value?: unknown;
    }) => sendLightControl(deviceId, action, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lights"] });
    },
  });

  return {
    ...query,
    data: query.data ?? [],
    control: controlMutation,
    sendControl: (deviceId: string, action: string, value?: unknown) =>
      controlMutation.mutateAsync({ deviceId, action, value }),
    isSending: controlMutation.isPending,
  };
}
