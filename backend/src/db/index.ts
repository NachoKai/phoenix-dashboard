import type {
  DashboardSection,
  DashboardState,
  GlobalSettings,
  WidgetInstance,
} from "../types.js";

let globalSettings: GlobalSettings = {
  theme: "dark",
  defaultRefreshInterval: 60,
  orientation: "auto",
  activeGroup: 1,
};

let sections: DashboardSection[] = [
  { id: "default", name: "Dashboard", position: 0, flex: 1, layout: "full-width", group: 1 },
  { id: "weather-group", name: "Weather", position: 1, flex: 1, layout: "full-width", group: 2 },
];

let widgets: WidgetInstance[] = [
  {
    id: "clock-1",
    type: "clock",
    position: 0,
    section: "default",
    config: { format: "24h", timezone: "local", showSeconds: false },
  },
  {
    id: "weather-1",
    type: "weather",
    position: 0,
    section: "weather-group",
    config: { location: "London", units: "metric", refreshInterval: 600 },
  },
  {
    id: "gifs-1",
    type: "gifs",
    position: 1,
    section: "default",
    config: {
      source: "static",
      urls: [
        "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
        "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      ],
      rotationInterval: 30,
      tag: "nature",
    },
  },
];

const encryptedKeys = new Map<string, string>();
const apiCache = new Map<string, { value: string; expiresAt: number }>();

export function getGlobalSettings(): GlobalSettings {
  return { ...globalSettings };
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  globalSettings = { ...settings };
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
  return true;
}

export function getWidgets(): WidgetInstance[] {
  return [...widgets].sort((a, b) => a.position - b.position);
}

export function saveWidgets(newWidgets: WidgetInstance[]): void {
  widgets = [...newWidgets];
}

export function getDashboardState(): DashboardState {
  return {
    widgets: getWidgets(),
    sections: getSections(),
    globalSettings: getGlobalSettings(),
  };
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
