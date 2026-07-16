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

function getInitialData(): DashboardState | undefined {
  const deviceId = getDeviceId();
  return loadDashboardCache(deviceId) ?? migrateLegacyCache(deviceId) ?? undefined;
}

export function useDashboardQuery() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();

  const query = useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: fetchDashboard,
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
      return updater(old);
    });
  };

  const persistState = (state: DashboardState) => {
    saveDashboardCache(deviceId, state);
    saveMutation.mutate(state);
  };

  const saveAll = async (state: DashboardState) => {
    await apiSaveWidgets(state.widgets);
    await apiSaveGlobalSettings(state.globalSettings);
    await saveDashboardState(state);
    saveDashboardCache(deviceId, state);
    queryClient.setQueryData(DASHBOARD_KEY, state);
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
