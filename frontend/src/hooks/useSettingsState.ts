import { useCallback, useEffect, useState } from "react";
import {
  checkStoredKey,
  createSection,
  deleteSection as apiDeleteSection,
  fetchWidgetRegistry,
  reorderSections,
  saveApiKey,
  saveDashboardState,
  saveGlobalSettings,
  saveWidgets,
} from "../api";
import type {
  DashboardState,
  SectionLayout,
  WidgetDefinition,
  WidgetInstance,
} from "../types";
import { v4 as uuid } from "../utils/id";

export function useSettingsState(
  deviceId: string,
  dashboardState: DashboardState | null,
  updateState: (updater: (prev: DashboardState) => DashboardState) => void,
) {
  const [state, setState] = useState(dashboardState);
  const [registry, setRegistry] = useState<WidgetDefinition[]>([]);
  const [keyMasks, setKeyMasks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardState && !state) {
      setState(dashboardState);
    }
  }, [dashboardState, state]);

  const load = useCallback(async () => {
    const reg = await fetchWidgetRegistry();
    setRegistry(reg);

    if (!dashboardState) return;

    const secretFields: { widgetId: string; key: string }[] = [];
    for (const w of dashboardState.widgets) {
      const def = reg.find(r => r.type === w.type);
      for (const field of def?.configSchema ?? []) {
        if (field.type === "secret") {
          secretFields.push({ widgetId: w.id, key: field.key });
        }
      }
    }

    const results = await Promise.all(
      secretFields.map(f =>
        checkStoredKey(f.widgetId, f.key).then(r => ({ ...f, ...r })),
      ),
    );

    const masks: Record<string, string> = {};
    for (const r of results) {
      if (r.hasValue && r.masked) {
        masks[`${r.widgetId}:${r.key}`] = r.masked;
      }
    }
    setKeyMasks(masks);
  }, [dashboardState]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateWidgetConfig = useCallback((id: string, key: string, value: unknown) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map(w =>
          w.id === id ? { ...w, config: { ...w.config, [key]: value } } : w,
        ),
      };
    });
  }, []);

  const addWidget = async (type: string) => {
    if (!state) return;
    const def = registry.find(r => r.type === type);
    if (!def) return;
    const sorted = [...state.sections].sort((a, b) => a.position - b.position);
    const emptySection = sorted.find(s => !state.widgets.some(w => w.section === s.id));
    let targetSectionId = emptySection?.id;

    if (!targetSectionId) {
      try {
        const { section } = await createSection(deviceId);
        setState({ ...state, sections: [...state.sections, section] });
        targetSectionId = section.id;
      } catch {
        console.error("[dashboard] Failed to create section for new widget");
        return;
      }
    }
    const newWidget: WidgetInstance = {
      id: `${type}-${uuid()}`,
      type,
      position: state.widgets.filter(w => w.section === targetSectionId).length,
      section: targetSectionId,
      config: { ...def.defaultConfig },
    };
    setState(s => (s ? { ...s, widgets: [...s.widgets, newWidget] } : s));
  };

  const removeWidget = (id: string) => {
    if (!state) return;
    setState({ ...state, widgets: state.widgets.filter(w => w.id !== id) });
  };

  const moveWidget = (id: string, direction: -1 | 1) => {
    if (!state) return;
    const idx = state.widgets.findIndex(w => w.id === id);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= state.widgets.length) return;
    const widgets = [...state.widgets];
    [widgets[idx], widgets[newIdx]] = [widgets[newIdx], widgets[idx]];
    setState({ ...state, widgets });
  };

  const changeWidgetSection = (id: string, sectionId: string) => {
    if (!state) return;
    setState({
      ...state,
      widgets: state.widgets.map(w => (w.id === id ? { ...w, section: sectionId } : w)),
    });
  };

  const handleAddSection = async () => {
    if (!state) return;
    try {
      const { section } = await createSection(deviceId);
      setState({ ...state, sections: [...state.sections, section] });
    } catch {
      console.error("[dashboard] Failed to create section");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!state) return;
    try {
      await apiDeleteSection(deviceId, sectionId);
      setState({
        ...state,
        sections: state.sections.filter(s => s.id !== sectionId),
        widgets: state.widgets.filter(w => w.section !== sectionId),
      });
    } catch {
      console.error("[dashboard] Failed to delete section");
    }
  };

  const handleSetLayout = (sectionId: string, layout: SectionLayout) => {
    if (!state) return;
    setState({
      ...state,
      sections: state.sections.map(s => (s.id === sectionId ? { ...s, layout } : s)),
    });
  };

  const handleSetSectionGroup = (sectionId: string, group: number | undefined) => {
    if (!state) return;
    setState({
      ...state,
      sections: state.sections.map(s => (s.id === sectionId ? { ...s, group } : s)),
    });
  };

  const handleSave = async () => {
    if (!state) return;
    setSaving(true);
    setMessage(null);
    try {
      const cleanedWidgets = state.widgets.map(w =>
        w.type === "gifs" && Array.isArray(w.config.urls)
          ? {
              ...w,
              config: {
                ...w.config,
                urls: (w.config.urls as string[]).filter(u => u.trim() !== ""),
              },
            }
          : w,
      );
      const cleaned = { ...state, widgets: cleanedWidgets };
      await Promise.all([
        saveWidgets(deviceId, cleanedWidgets),
        saveGlobalSettings(deviceId, state.globalSettings),
        reorderSections(
          deviceId,
          state.sections.map((s, i) => ({ ...s, position: i, name: `Section ${i + 1}` })),
        ),
        saveDashboardState(deviceId, cleaned),
      ]);
      setState(cleaned);
      updateState(() => cleaned);
      setMessage("Saved successfully");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSecretSave = async (widgetId: string, keyName: string, value: string) => {
    if (!value.trim()) return;
    try {
      const result = await saveApiKey(deviceId, widgetId, keyName, value);
      setKeyMasks(m => ({ ...m, [`${widgetId}:${keyName}`]: result.masked }));
      setMessage("API key saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save key");
    }
  };

  return {
    state,
    setState,
    registry,
    keyMasks,
    saving,
    message,
    setMessage,
    updateWidgetConfig,
    addWidget,
    removeWidget,
    moveWidget,
    changeWidgetSection,
    handleAddSection,
    handleDeleteSection,
    handleSetLayout,
    handleSetSectionGroup,
    handleSave,
    handleSecretSave,
  };
}
