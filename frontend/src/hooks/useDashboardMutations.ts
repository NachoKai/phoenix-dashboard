import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveDashboardState,
  saveWidgets,
  saveGlobalSettings,
  createSection,
  deleteSection,
  reorderSections,
  saveApiKey,
} from "../api";
import { saveDashboardCache } from "../utils/storage";
import { getDeviceId } from "../utils/deviceId";
import type { DashboardState, DashboardSection, WidgetInstance } from "../types";

const DASHBOARD_KEY = ["dashboard"] as const;

function deviceKey() {
  return [...DASHBOARD_KEY, getDeviceId()] as const;
}

export function useSaveDashboardStateMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: (state: DashboardState) => saveDashboardState(deviceId, state),
    onMutate: async state => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      queryClient.setQueryData<DashboardState>(key, state);
      saveDashboardCache(deviceId, state);
      return { previous };
    },
    onError: (_err, _state, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useSaveWidgetsMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: (widgets: WidgetInstance[]) => saveWidgets(deviceId, widgets),
    onMutate: async widgets => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      queryClient.setQueryData<DashboardState>(key, old => {
        if (!old) return old;
        return { ...old, widgets };
      });
      saveDashboardCache(deviceId, queryClient.getQueryData(key) as DashboardState);
      return { previous };
    },
    onError: (_err, _widgets, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useSaveGlobalSettingsMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: (settings: import("../types").GlobalSettings) =>
      saveGlobalSettings(deviceId, settings),
    onMutate: async settings => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      queryClient.setQueryData<DashboardState>(key, old => {
        if (!old) return old;
        return { ...old, globalSettings: settings };
      });
      saveDashboardCache(deviceId, queryClient.getQueryData(key) as DashboardState);
      return { previous };
    },
    onError: (_err, _settings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useCreateSectionMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: () => createSection(deviceId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      return { previous };
    },
    onSuccess: data => {
      queryClient.setQueryData<DashboardState>(key, old => {
        if (!old) return old;
        return { ...old, sections: [...old.sections, data.section] };
      });
      saveDashboardCache(deviceId, queryClient.getQueryData(key) as DashboardState);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useDeleteSectionMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: (sectionId: string) => deleteSection(deviceId, sectionId),
    onMutate: async sectionId => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      queryClient.setQueryData<DashboardState>(key, old => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.filter(s => s.id !== sectionId),
          widgets: old.widgets.filter(w => w.section !== sectionId),
        };
      });
      saveDashboardCache(deviceId, queryClient.getQueryData(key) as DashboardState);
      return { previous };
    },
    onError: (_err, _sectionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useReorderSectionsMutation() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const key = deviceKey();

  return useMutation({
    mutationFn: (sections: DashboardSection[]) => reorderSections(deviceId, sections),
    onMutate: async sections => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardState>(key);
      queryClient.setQueryData<DashboardState>(key, old => {
        if (!old) return old;
        return { ...old, sections };
      });
      saveDashboardCache(deviceId, queryClient.getQueryData(key) as DashboardState);
      return { previous };
    },
    onError: (_err, _sections, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
        saveDashboardCache(deviceId, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      const current = queryClient.getQueryData<DashboardState>(key);
      if (current) saveDashboardCache(deviceId, current);
    },
  });
}

export function useSaveApiKeyMutation() {
  const deviceId = getDeviceId();

  return useMutation({
    mutationFn: ({
      widgetId,
      keyName,
      value,
    }: {
      widgetId: string;
      keyName: string;
      value: string;
    }) => saveApiKey(deviceId, widgetId, keyName, value),
  });
}
