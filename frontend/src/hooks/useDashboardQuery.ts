import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDashboard, saveDashboardState } from "../api";
import {
  loadDashboardCache,
  migrateLegacyCache,
  saveDashboardCache,
} from "../utils/storage";
import { getDeviceId } from "../utils/deviceId";
import type { DashboardState } from "../types";

const DASHBOARD_KEY = ["dashboard"] as const;

function deduplicateWidgets(state: DashboardState): DashboardState {
  const seen = new Set<string>();
  const unique = state.widgets.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
  if (unique.length === state.widgets.length) return state;
  return { ...state, widgets: unique };
}

function getInitialData(): DashboardState | undefined {
  const deviceId = getDeviceId();
  const cached = loadDashboardCache(deviceId) ?? migrateLegacyCache(deviceId);
  return cached ? deduplicateWidgets(cached) : undefined;
}

export function useDashboardQuery() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const deviceKey = [...DASHBOARD_KEY, deviceId] as const;

  const query = useQuery({
    queryKey: deviceKey,
    queryFn: () => fetchDashboard(deviceId),
    select: deduplicateWidgets,
    initialData: getInitialData,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) {
      saveDashboardCache(deviceId, query.data);
    }
  }, [query.data, deviceId]);

  const saveMutation = useMutation({
    mutationFn: (state: DashboardState) => saveDashboardState(deviceId, state),
    onMutate: async state => {
      await queryClient.cancelQueries({ queryKey: deviceKey });
      const previous = queryClient.getQueryData<DashboardState>(deviceKey);
      queryClient.setQueryData<DashboardState>(deviceKey, state);
      saveDashboardCache(deviceId, state);
      return { previous };
    },
    onError: (_err, _state, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deviceKey, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceKey });
      const current = queryClient.getQueryData<DashboardState>(deviceKey);
      if (current) saveDashboardCache(deviceId, current);
    },
  });

  const updateState = (updater: (prev: DashboardState) => DashboardState) => {
    queryClient.setQueryData<DashboardState>(deviceKey, old => {
      if (!old) return old;
      return deduplicateWidgets(updater(old));
    });
  };

  const persistState = (state: DashboardState) => {
    const clean = deduplicateWidgets(state);
    saveDashboardCache(deviceId, clean);
    saveMutation.mutate(clean);
  };

  return {
    state: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    updateState,
    persistState,
    saveMutation,
    isSaving: saveMutation.isPending,
  };
}
