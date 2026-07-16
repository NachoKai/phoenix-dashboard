import type { DashboardState } from "./types";
import { saveDashboardCache } from "./utils/storage";
import { getDeviceId } from "./utils/deviceId";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchDashboard(): Promise<DashboardState> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export async function saveDashboardState(state: DashboardState): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("Failed to save dashboard state");
  const body = (await res.json()) as { lastModified?: number };
  const deviceId = getDeviceId();
  saveDashboardCache(deviceId, { ...state, lastModified: body.lastModified });
}

export async function fetchWidgetRegistry(): Promise<
  import("./types").WidgetDefinition[]
> {
  const res = await fetch(`${API_BASE}/widgets/registry`);
  if (!res.ok) throw new Error("Failed to load widget registry");
  return res.json();
}

export async function saveWidgets(
  widgets: import("./types").WidgetInstance[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/widgets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgets }),
  });
  if (!res.ok) throw new Error("Failed to save widgets");
}

export async function saveGlobalSettings(
  settings: import("./types").GlobalSettings,
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}

export async function saveApiKey(
  widgetId: string,
  keyName: string,
  value: string,
): Promise<{ masked: string }> {
  const res = await fetch(`${API_BASE}/dashboard/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetId, keyName, value }),
  });
  if (!res.ok) throw new Error("Failed to save API key");
  return res.json();
}

export async function checkStoredKey(
  widgetId: string,
  keyName: string,
): Promise<{ hasValue: boolean; masked?: string }> {
  const res = await fetch(`${API_BASE}/dashboard/keys/${widgetId}/${keyName}`);
  if (!res.ok) return { hasValue: false };
  return res.json();
}

// ── Section management ──

export async function fetchSections(): Promise<import("./types").DashboardSection[]> {
  const res = await fetch(`${API_BASE}/dashboard/sections`);
  if (!res.ok) throw new Error("Failed to load sections");
  return res.json();
}

export async function createSection(): Promise<{
  section: import("./types").DashboardSection;
}> {
  const res = await fetch(`${API_BASE}/dashboard/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create section");
  return res.json();
}

export async function renameSection(id: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/sections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to rename section");
}

export async function deleteSection(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/sections/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete section");
}

export async function reorderSections(
  sections: import("./types").DashboardSection[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/sections/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections }),
  });
  if (!res.ok) throw new Error("Failed to reorder sections");
}
