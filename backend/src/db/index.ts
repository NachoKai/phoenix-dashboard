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
const KEYS_FILE = path.join(DATA_DIR, "encrypted-keys.json");

interface PersistedState {
  globalSettings: GlobalSettings;
  sections: DashboardSection[];
  widgets: WidgetInstance[];
  lastModified?: number;
}

function loadFromDisk(): PersistedState {
  try {
    const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
    return JSON.parse(raw) as PersistedState;
  } catch {
    console.error("[db] Failed to load persisted state; initializing with defaults");
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
      lastModified: 0,
    };
  }
}

const initial = loadFromDisk();

let globalSettings: GlobalSettings = initial.globalSettings;
let sections: DashboardSection[] = initial.sections;
let widgets: WidgetInstance[] = initial.widgets;
let lastModified: number = initial.lastModified ?? 0;

function persistToDisk(): void {
  try {
    const state: PersistedState = {
      globalSettings: { ...globalSettings },
      sections: [...sections],
      widgets: [...widgets],
      lastModified,
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    console.error("[db] Failed to persist state to disk; changes may be lost");
    // best-effort; don't crash the server on write failure
  }
}

function loadEncryptedKeysFromDisk(): Map<string, string> {
  try {
    const raw = fs.readFileSync(KEYS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch {
    console.error("[db] Failed to load encrypted keys from disk");
    return new Map();
  }
}

function persistEncryptedKeys(): void {
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of encryptedKeys) {
      obj[k] = v;
    }
    fs.writeFileSync(KEYS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch {
    console.error("[db] Failed to persist encrypted keys to disk");
    // best-effort
  }
}

const encryptedKeys = loadEncryptedKeysFromDisk();
const apiCache = new Map<string, { value: string; expiresAt: number }>();

export function getGlobalSettings(): GlobalSettings {
  return { ...globalSettings };
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  globalSettings = { ...settings };
  lastModified = Date.now();
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
  lastModified = Date.now();
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
  lastModified = Date.now();
  persistToDisk();
  return section;
}

export function deleteSection(id: string): boolean {
  if (sections.length === 0) return false;
  widgets = widgets.filter(w => w.section !== id);
  sections = sections.filter(s => s.id !== id);
  sections.forEach((s, i) => {
    s.position = i;
  });
  lastModified = Date.now();
  persistToDisk();
  return true;
}

export function getWidgets(): WidgetInstance[] {
  return [...widgets].sort((a, b) => a.position - b.position);
}

export function saveWidgets(newWidgets: WidgetInstance[]): void {
  widgets = [...newWidgets];
  lastModified = Date.now();
  persistToDisk();
}

export function getDashboardState(): DashboardState {
  return {
    widgets: getWidgets(),
    sections: getSections(),
    globalSettings: getGlobalSettings(),
    lastModified,
  };
}

export function saveDashboardState(state: DashboardState): void {
  widgets = [...state.widgets];
  sections = [...state.sections];
  globalSettings = { ...state.globalSettings };
  lastModified = Date.now();
  persistToDisk();
}

export function saveEncryptedKey(
  widgetId: string,
  keyName: string,
  encrypted: string,
): void {
  encryptedKeys.set(`${widgetId}:${keyName}`, encrypted);
  persistEncryptedKeys();
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
  persistEncryptedKeys();
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
