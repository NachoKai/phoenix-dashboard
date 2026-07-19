import type { DashboardState } from "./types";
import { saveDashboardCache } from "./utils/storage";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function qp(deviceId: string): string {
  return `?deviceId=${encodeURIComponent(deviceId)}`;
}

export async function fetchDashboard(deviceId: string): Promise<DashboardState> {
  const res = await fetch(`${API_BASE}/dashboard${qp(deviceId)}`);
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export async function saveDashboardState(
  deviceId: string,
  state: DashboardState,
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard${qp(deviceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("Failed to save dashboard state");
  const body = (await res.json()) as { lastModified?: number };
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
  deviceId: string,
  widgets: import("./types").WidgetInstance[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/widgets${qp(deviceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgets }),
  });
  if (!res.ok) throw new Error("Failed to save widgets");
}

export async function saveGlobalSettings(
  deviceId: string,
  settings: import("./types").GlobalSettings,
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/settings${qp(deviceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}

export async function saveApiKey(
  deviceId: string,
  widgetId: string,
  keyName: string,
  value: string,
): Promise<{ masked: string }> {
  const res = await fetch(`${API_BASE}/dashboard/keys${qp(deviceId)}`, {
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

export async function fetchSections(
  deviceId: string,
): Promise<import("./types").DashboardSection[]> {
  const res = await fetch(`${API_BASE}/dashboard/sections${qp(deviceId)}`);
  if (!res.ok) throw new Error("Failed to load sections");
  return res.json();
}

export async function createSection(
  deviceId: string,
): Promise<{ section: import("./types").DashboardSection }> {
  const res = await fetch(`${API_BASE}/dashboard/sections${qp(deviceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create section");
  return res.json();
}

export async function deleteSection(deviceId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/sections/${id}${qp(deviceId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete section");
}

export async function reorderSections(
  deviceId: string,
  sections: import("./types").DashboardSection[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/sections/reorder${qp(deviceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections }),
  });
  if (!res.ok) throw new Error("Failed to reorder sections");
}
