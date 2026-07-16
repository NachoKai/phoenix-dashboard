import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface VacuumData {
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

async function fetchVacuum(): Promise<VacuumData> {
  const res = await fetch(`${API_BASE}/vacuum/status`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function sendVacuumControl(deviceId: string, action: string): Promise<void> {
  const res = await fetch(`${API_BASE}/vacuum/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export function useVacuumQuery({
  refreshInterval,
  enabled = true,
}: {
  refreshInterval: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["vacuum"],
    queryFn: fetchVacuum,
    refetchInterval: enabled ? refreshInterval : false,
    staleTime: refreshInterval * 3,
    enabled,
  });

  const controlMutation = useMutation({
    mutationFn: ({ action }: { action: string }) =>
      sendVacuumControl(query.data?.id ?? "", action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacuum"] });
    },
  });

  return {
    ...query,
    controlMutation,
    sendControl: (action: string) => controlMutation.mutateAsync({ action }),
    isSending: controlMutation.isPending,
  };
}
