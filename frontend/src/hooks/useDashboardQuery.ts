import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboard,
  saveDashboardState,
  saveWidgets as apiSaveWidgets,
  saveGlobalSettings as apiSaveGlobalSettings,
} from "../api";
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
  const unique = state.widgets.filter((w) => {
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

  const query = useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: fetchDashboard,
    select: deduplicateWidgets,
    initialData: getInitialData,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (state: DashboardState) => saveDashboardState(state),
    onSuccess: (_data, variables) => {
      saveDashboardCache(deviceId, variables);
      queryClient.setQueryData<DashboardState>(DASHBOARD_KEY, variables);
    },
  });

  const updateState = (updater: (prev: DashboardState) => DashboardState) => {
    queryClient.setQueryData<DashboardState>(DASHBOARD_KEY, old => {
      if (!old) return old;
      return deduplicateWidgets(updater(old));
    });
  };

  const persistState = (state: DashboardState) => {
    const clean = deduplicateWidgets(state);
    saveDashboardCache(deviceId, clean);
    saveMutation.mutate(clean);
  };

  const saveAll = async (state: DashboardState) => {
    const clean = deduplicateWidgets(state);
    await apiSaveWidgets(clean.widgets);
    await apiSaveGlobalSettings(clean.globalSettings);
    await saveDashboardState(clean);
    saveDashboardCache(deviceId, clean);
    queryClient.setQueryData(DASHBOARD_KEY, clean);
  };

  return {
    state: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
    updateState,
    persistState,
    saveAll,
    isSaving: saveMutation.isPending,
  };
}
