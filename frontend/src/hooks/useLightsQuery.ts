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

const LIGHTS_KEY = ["lights"] as const;

export function useLightsQuery({
  refreshInterval,
  enabled = true,
}: {
  refreshInterval: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: LIGHTS_KEY,
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
    onMutate: async ({ deviceId, action, value }) => {
      await queryClient.cancelQueries({ queryKey: LIGHTS_KEY });
      const previous = queryClient.getQueryData<LightDevice[]>(LIGHTS_KEY);
      queryClient.setQueryData<LightDevice[]>(LIGHTS_KEY, old => {
        if (!old) return old;
        return old.map(light => {
          if (light.id !== deviceId) return light;
          if (action === "toggle" || action === "on" || action === "off") {
            const newOn = action === "toggle" ? !light.isOn : action === "on";
            return { ...light, isOn: newOn };
          }
          if (action === "setBrightness" && typeof value === "number") {
            return { ...light, brightness: value };
          }
          if (action === "setColorTemp" && typeof value === "number") {
            return { ...light, colorTemp: value };
          }
          if (action === "setColor" && typeof value === "string") {
            return { ...light, color: value };
          }
          return light;
        });
      });
      return { previous };
    },
    onError: (_err, _params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIGHTS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIGHTS_KEY });
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
