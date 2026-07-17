import type { DashboardState } from "../types";

const LEGACY_KEY = "phoenix-dashboard-state";

function deviceKey(deviceId: string): string {
  return `phoenix-dashboard-state-${deviceId}`;
}

export function loadDashboardCache(deviceId: string): DashboardState | null {
  try {
    const raw = localStorage.getItem(deviceKey(deviceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardState;
    if (!parsed.widgets || !parsed.sections || !parsed.globalSettings) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDashboardCache(deviceId: string, state: DashboardState): void {
  try {
    localStorage.setItem(deviceKey(deviceId), JSON.stringify(state));
  } catch {
    console.error("[storage] Failed to save dashboard cache");
    // localStorage full or unavailable — silently ignore
  }
}

export function clearDashboardCache(deviceId: string): void {
  try {
    localStorage.removeItem(deviceKey(deviceId));
  } catch {
    console.error("[storage] Failed to clear dashboard cache");
    // ignore
  }
}

export function migrateLegacyCache(deviceId: string): DashboardState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardState;
    if (!parsed.widgets || !parsed.sections || !parsed.globalSettings) return null;
    localStorage.removeItem(LEGACY_KEY);
    saveDashboardCache(deviceId, parsed);
    return parsed;
  } catch {
    console.error("[storage] Failed to migrate legacy dashboard cache");
    return null;
  }
}
