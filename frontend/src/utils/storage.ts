import type { DashboardState } from "../types";

const STORAGE_KEY = "phoenix-dashboard-state";

export function loadDashboardCache(): DashboardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardState;
    if (!parsed.widgets || !parsed.sections || !parsed.globalSettings) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDashboardCache(state: DashboardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearDashboardCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
