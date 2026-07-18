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
const DATA_DIR =
  process.env.DATA_DIR || path.resolve(path.dirname(__filename), "../../data");
const PERSIST_FILE = path.join(DATA_DIR, "dashboard-state.json");
const BACKUP_FILE = path.join(DATA_DIR, "dashboard-state.json.bak");
const KEYS_FILE = path.join(DATA_DIR, "encrypted-keys.json");

const CURRENT_VERSION = 2;

interface PerDeviceData {
  widgets: WidgetInstance[];
  sections: DashboardSection[];
  globalSettings: GlobalSettings;
  lastModified: number;
}

interface PersistedStateV2 {
  version: typeof CURRENT_VERSION;
  devices: Record<string, PerDeviceData>;
}

interface PersistedStateV1 {
  globalSettings: GlobalSettings;
  sections: DashboardSection[];
  widgets: WidgetInstance[];
  lastModified?: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
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
};

function createDefaultDeviceData(): PerDeviceData {
  return {
    globalSettings: { ...DEFAULT_SETTINGS },
    sections: [],
    widgets: [],
    lastModified: 0,
  };
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    console.error("[db] Failed to create data directory at", DATA_DIR);
  }
}

let devices: Record<string, PerDeviceData> = {};

function loadFromDisk(): void {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(PERSIST_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (parsed.version === CURRENT_VERSION && parsed.devices) {
      devices = parsed.devices as Record<string, PerDeviceData>;
      return;
    }

    const v1 = parsed as PersistedStateV1;
    if (v1.globalSettings) {
      devices = {
        _migrated_: {
          globalSettings: v1.globalSettings,
          sections: v1.sections ?? [],
          widgets: v1.widgets ?? [],
          lastModified: v1.lastModified ?? 0,
        },
      };
      persistToDisk();
      console.warn("[db] Migrated v1 format to v2");
      return;
    }

    console.error("[db] Unknown persisted format; initializing with defaults");
    devices = {};
  } catch {
    try {
      console.warn("[db] Primary file missing; trying backup…");
      const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.version === CURRENT_VERSION && parsed.devices) {
        devices = parsed.devices;
      } else {
        devices = {};
      }
      persistToDisk();
      console.warn("[db] Restored primary file from backup");
    } catch {
      console.error("[db] No backup either; initializing with defaults");
      devices = {};
    }
  }
}

function persistToDisk(): void {
  try {
    const state: PersistedStateV2 = {
      version: CURRENT_VERSION,
      devices,
    };
    const json = JSON.stringify(state, null, 2);
    fs.writeFileSync(PERSIST_FILE, json, "utf-8");
    const tmp = BACKUP_FILE + ".tmp";
    fs.writeFileSync(tmp, json, "utf-8");
    fs.renameSync(tmp, BACKUP_FILE);
  } catch {
    console.error("[db] Failed to persist state to disk; changes may be lost");
  }
}

loadFromDisk();

function getOrCreateDeviceData(deviceId: string): PerDeviceData {
  let data = devices[deviceId];
  if (data) return data;

  const template = devices["_migrated_"];
  if (template) {
    data = {
      globalSettings: { ...template.globalSettings },
      sections: template.sections.map(s => ({ ...s })),
      widgets: template.widgets.map(w => ({ ...w, config: { ...w.config } })),
      lastModified: template.lastModified,
    };
    devices[deviceId] = data;
    persistToDisk();
    return data;
  }

  data = createDefaultDeviceData();
  devices[deviceId] = data;
  persistToDisk();
  return data;
}

export function getGlobalSettings(deviceId: string): GlobalSettings {
  return { ...getOrCreateDeviceData(deviceId).globalSettings };
}

export function saveGlobalSettings(deviceId: string, settings: GlobalSettings): void {
  const data = getOrCreateDeviceData(deviceId);
  data.globalSettings = { ...settings };
  data.lastModified = Date.now();
  persistToDisk();
}

export function getSections(deviceId: string): DashboardSection[] {
  const data = getOrCreateDeviceData(deviceId);
  return [...data.sections].sort((a, b) => a.position - b.position);
}

export function saveSections(deviceId: string, newSections: DashboardSection[]): void {
  const data = getOrCreateDeviceData(deviceId);
  data.sections = newSections.map((s, i) => ({
    ...s,
    position: i,
    name: s.name || `Section ${i + 1}`,
  }));
  data.lastModified = Date.now();
  persistToDisk();
}

export function addSection(deviceId: string): DashboardSection {
  const data = getOrCreateDeviceData(deviceId);
  const maxPos = data.sections.reduce((max, s) => Math.max(max, s.position), -1);
  const id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const name = `Section ${data.sections.length + 1}`;
  const section: DashboardSection = {
    id,
    name,
    position: maxPos + 1,
    flex: 1,
    layout: "full-width",
  };
  data.sections.push(section);
  data.lastModified = Date.now();
  persistToDisk();
  return section;
}

export function deleteSection(deviceId: string, id: string): boolean {
  const data = getOrCreateDeviceData(deviceId);
  if (data.sections.length === 0) return false;
  data.widgets = data.widgets.filter(w => w.section !== id);
  data.sections = data.sections.filter(s => s.id !== id);
  data.sections.forEach((s, i) => { s.position = i; });
  data.lastModified = Date.now();
  persistToDisk();
  return true;
}

export function getWidgets(deviceId: string): WidgetInstance[] {
  const data = getOrCreateDeviceData(deviceId);
  return [...data.widgets].sort((a, b) => a.position - b.position);
}

export function saveWidgets(deviceId: string, newWidgets: WidgetInstance[]): void {
  const data = getOrCreateDeviceData(deviceId);
  data.widgets = [...newWidgets];
  data.lastModified = Date.now();
  persistToDisk();
}

export function getDashboardState(deviceId: string): DashboardState {
  const data = getOrCreateDeviceData(deviceId);
  return {
    widgets: [...data.widgets].sort((a, b) => a.position - b.position),
    sections: [...data.sections].sort((a, b) => a.position - b.position),
    globalSettings: { ...data.globalSettings },
    lastModified: data.lastModified,
  };
}

export function saveDashboardState(deviceId: string, state: DashboardState): void {
  const data = getOrCreateDeviceData(deviceId);
  data.widgets = [...state.widgets];
  data.sections = [...state.sections.map(s => ({ ...s }))];
  data.globalSettings = { ...state.globalSettings };
  data.lastModified = Date.now();
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
    const json = JSON.stringify(obj, null, 2);
    fs.writeFileSync(KEYS_FILE, json, "utf-8");
    const bak = KEYS_FILE + ".bak";
    const tmp = bak + ".tmp";
    fs.writeFileSync(tmp, json, "utf-8");
    fs.renameSync(tmp, bak);
  } catch {
    console.error("[db] Failed to persist encrypted keys to disk");
  }
}

const encryptedKeys = loadEncryptedKeysFromDisk();
const apiCache = new Map<string, { value: string; expiresAt: number }>();

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
