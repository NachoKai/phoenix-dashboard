import { loadDashboardCache, saveDashboardCache } from "./utils/storage";
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchDashboard(): Promise<import("./types").DashboardState> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error("Failed to load dashboard");
  const data: import("./types").DashboardState = await res.json();
  saveDashboardCache(data);
  return data;
}

export async function fetchDashboardWithCache(): Promise<
  import("./types").DashboardState
> {
  const cache = loadDashboardCache();
  fetchDashboard().catch(() => {});
  if (cache) return cache;
  return fetchDashboard();
}

export async function fetchWidgetRegistry(): Promise<
  import("./types").WidgetDefinition[]
> {
  const res = await fetch(`${API_BASE}/widgets/registry`);
  if (!res.ok) throw new Error("Failed to load widget registry");
  return res.json();
}

export function persistDashboardState(state: import("./types").DashboardState): void {
  saveDashboardCache(state);
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

export async function isPinRequired(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/settings/pin-required`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.required === true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/settings/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.ok === true;
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

export async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError ?? new Error("Request failed");
}
