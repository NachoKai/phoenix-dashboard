import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type {
  DashboardSection,
  DashboardState,
  GlobalSettings,
  WidgetInstance,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = path.resolve(path.dirname(__filename), "../../data");
const PERSIST_FILE = path.join(DATA_DIR, "dashboard-state.json");

interface PersistedState {
  globalSettings: GlobalSettings;
  sections: DashboardSection[];
  widgets: WidgetInstance[];
}

function loadFromDisk(): PersistedState {
  try {
    const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
    return JSON.parse(raw) as PersistedState;
  } catch {
    return {
      globalSettings: {
        theme: "dark",
        defaultRefreshInterval: 60,
        orientation: "auto",
        activeGroup: 1,
        autoRotateInterval: 0,
        sleepTimeEnabled: false,
        sleepStartHour: 23,
        sleepStartMinute: 0,
        sleepEndHour: 7,
        sleepEndMinute: 0,
      },
      sections: [],
      widgets: [],
    };
  }
}

const initial = loadFromDisk();

let globalSettings: GlobalSettings = initial.globalSettings;
let sections: DashboardSection[] = initial.sections;
let widgets: WidgetInstance[] = initial.widgets;

function persistToDisk(): void {
  try {
    const state: PersistedState = {
      globalSettings: { ...globalSettings },
      sections: [...sections],
      widgets: [...widgets],
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // best-effort; don't crash the server on write failure
  }
}

const encryptedKeys = new Map<string, string>();
const apiCache = new Map<string, { value: string; expiresAt: number }>();

export function getGlobalSettings(): GlobalSettings {
  return { ...globalSettings };
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  globalSettings = { ...settings };
  persistToDisk();
}

export function getSections(): DashboardSection[] {
  return [...sections].sort((a, b) => a.position - b.position);
}

export function saveSections(newSections: DashboardSection[]): void {
  sections = newSections.map((s, i) => ({
    ...s,
    position: i,
    name: s.name || `Section ${i + 1}`,
  }));
  persistToDisk();
}

export function addSection(): DashboardSection {
  const maxPos = sections.reduce((max, s) => Math.max(max, s.position), -1);
  const id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const name = `Section ${sections.length + 1}`;
  const section: DashboardSection = {
    id,
    name,
    position: maxPos + 1,
    flex: 1,
    layout: "full-width",
  };
  sections.push(section);
  return section;
}

export function deleteSection(id: string): boolean {
  if (sections.length === 0) return false;
  widgets = widgets.filter(w => w.section !== id);
  sections = sections.filter(s => s.id !== id);
  sections.forEach((s, i) => {
    s.position = i;
  });
  persistToDisk();
  return true;
}

export function getWidgets(): WidgetInstance[] {
  return [...widgets].sort((a, b) => a.position - b.position);
}

export function saveWidgets(newWidgets: WidgetInstance[]): void {
  widgets = [...newWidgets];
  persistToDisk();
}

export function getDashboardState(): DashboardState {
  return {
    widgets: getWidgets(),
    sections: getSections(),
    globalSettings: getGlobalSettings(),
  };
}

export function saveDashboardState(state: DashboardState): void {
  widgets = [...state.widgets];
  sections = [...state.sections];
  globalSettings = { ...state.globalSettings };
  persistToDisk();
}

export function saveEncryptedKey(
  widgetId: string,
  keyName: string,
  encrypted: string,
): void {
  encryptedKeys.set(`${widgetId}:${keyName}`, encrypted);
}

export function getEncryptedKey(widgetId: string, keyName: string): string | null {
  return encryptedKeys.get(`${widgetId}:${keyName}`) ?? null;
}

export function deleteEncryptedKeysForWidget(widgetId: string): void {
  for (const key of encryptedKeys.keys()) {
    if (key.startsWith(`${widgetId}:`)) {
      encryptedKeys.delete(key);
    }
  }
}

export function getCachedValue(cacheKey: string): string | null {
  const entry = apiCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

export function setCachedValue(cacheKey: string, value: string, ttlMs: number): void {
  apiCache.set(cacheKey, { value, expiresAt: Date.now() + ttlMs });
}

export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of apiCache) {
    if (now > entry.expiresAt) apiCache.delete(key);
  }
}
