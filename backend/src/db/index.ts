import type {
  DashboardSection,
  DashboardState,
  GlobalSettings,
  WidgetInstance,
} from "../types.js";
import { getClient, initDatabase } from "./turso.js";

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

export async function initDb(): Promise<void> {
  await initDatabase();
}

async function getOrCreateDeviceData(deviceId: string): Promise<{
  widgets: WidgetInstance[];
  sections: DashboardSection[];
  globalSettings: GlobalSettings;
  lastModified: number;
}> {
  const client = getClient();
  const row = await client.execute({
    sql: "SELECT widgets, sections, global_settings, last_modified FROM device_state WHERE device_id = ?",
    args: [deviceId],
  });

  if (row.rows.length > 0) {
    const r = row.rows[0];
    return {
      widgets: JSON.parse(r.widgets as string),
      sections: JSON.parse(r.sections as string),
      globalSettings: JSON.parse(r.global_settings as string),
      lastModified: r.last_modified as number,
    };
  }

  const template = await client.execute({
    sql: "SELECT widgets, sections, global_settings, last_modified FROM device_state WHERE device_id = ?",
    args: ["_migrated_"],
  });

  if (template.rows.length > 0) {
    const t = template.rows[0];
    const data = {
      widgets: JSON.parse(t.widgets as string),
      sections: JSON.parse(t.sections as string),
      globalSettings: JSON.parse(t.global_settings as string),
      lastModified: t.last_modified as number,
    };
    await client.execute({
      sql: "INSERT INTO device_state (device_id, widgets, sections, global_settings, last_modified) VALUES (?, ?, ?, ?, ?)",
      args: [
        deviceId,
        JSON.stringify(data.widgets),
        JSON.stringify(data.sections),
        JSON.stringify(data.globalSettings),
        data.lastModified,
      ],
    });
    return data;
  }

  await client.execute({
    sql: "INSERT INTO device_state (device_id, widgets, sections, global_settings, last_modified) VALUES (?, ?, ?, ?, ?)",
    args: [
      deviceId,
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(DEFAULT_SETTINGS),
      0,
    ],
  });

  return {
    widgets: [],
    sections: [],
    globalSettings: { ...DEFAULT_SETTINGS },
    lastModified: 0,
  };
}

function touch(deviceId: string): void {
  getClient().execute({
    sql: "UPDATE device_state SET last_modified = ? WHERE device_id = ?",
    args: [Date.now(), deviceId],
  });
}

export async function getGlobalSettings(deviceId: string): Promise<GlobalSettings> {
  const data = await getOrCreateDeviceData(deviceId);
  return { ...data.globalSettings };
}

export async function saveGlobalSettings(
  deviceId: string,
  settings: GlobalSettings,
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET global_settings = ?, last_modified = ? WHERE device_id = ?",
    args: [JSON.stringify(settings), Date.now(), deviceId],
  });
}

export async function getSections(deviceId: string): Promise<DashboardSection[]> {
  const data = await getOrCreateDeviceData(deviceId);
  return [...data.sections].sort((a, b) => a.position - b.position);
}

export async function saveSections(
  deviceId: string,
  newSections: DashboardSection[],
): Promise<void> {
  const sections = newSections.map((s, i) => ({
    ...s,
    position: i,
    name: s.name || `Section ${i + 1}`,
  }));
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET sections = ?, last_modified = ? WHERE device_id = ?",
    args: [JSON.stringify(sections), Date.now(), deviceId],
  });
}

export async function addSection(deviceId: string): Promise<DashboardSection> {
  const data = await getOrCreateDeviceData(deviceId);
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
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET sections = ?, last_modified = ? WHERE device_id = ?",
    args: [JSON.stringify(data.sections), Date.now(), deviceId],
  });
  return section;
}

export async function deleteSection(deviceId: string, id: string): Promise<void> {
  const data = await getOrCreateDeviceData(deviceId);
  data.widgets = data.widgets.filter(w => w.section !== id);
  data.sections = data.sections.filter(s => s.id !== id);
  data.sections.forEach((s, i) => {
    s.position = i;
  });
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET widgets = ?, sections = ?, last_modified = ? WHERE device_id = ?",
    args: [
      JSON.stringify(data.widgets),
      JSON.stringify(data.sections),
      Date.now(),
      deviceId,
    ],
  });
}

export async function getWidgets(deviceId: string): Promise<WidgetInstance[]> {
  const data = await getOrCreateDeviceData(deviceId);
  return [...data.widgets].sort((a, b) => a.position - b.position);
}

export async function saveWidgets(
  deviceId: string,
  newWidgets: WidgetInstance[],
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET widgets = ?, last_modified = ? WHERE device_id = ?",
    args: [JSON.stringify(newWidgets), Date.now(), deviceId],
  });
}

export async function getDashboardState(deviceId: string): Promise<DashboardState> {
  const data = await getOrCreateDeviceData(deviceId);
  return {
    widgets: [...data.widgets].sort((a, b) => a.position - b.position),
    sections: [...data.sections].sort((a, b) => a.position - b.position),
    globalSettings: { ...data.globalSettings },
    lastModified: data.lastModified,
  };
}

export async function saveDashboardState(
  deviceId: string,
  state: DashboardState,
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "UPDATE device_state SET widgets = ?, sections = ?, global_settings = ?, last_modified = ? WHERE device_id = ?",
    args: [
      JSON.stringify(state.widgets),
      JSON.stringify(state.sections),
      JSON.stringify(state.globalSettings),
      Date.now(),
      deviceId,
    ],
  });
}

export async function saveEncryptedKey(
  widgetId: string,
  keyName: string,
  encrypted: string,
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT OR REPLACE INTO encrypted_keys (key, value) VALUES (?, ?)",
    args: [`${widgetId}:${keyName}`, encrypted],
  });
}

export async function getEncryptedKey(
  widgetId: string,
  keyName: string,
): Promise<string | null> {
  const client = getClient();
  const row = await client.execute({
    sql: "SELECT value FROM encrypted_keys WHERE key = ?",
    args: [`${widgetId}:${keyName}`],
  });
  return row.rows.length > 0 ? (row.rows[0].value as string) : null;
}

export async function deleteEncryptedKeysForWidget(widgetId: string): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "DELETE FROM encrypted_keys WHERE key LIKE ?",
    args: [`${widgetId}:%`],
  });
}

export async function getCachedValue(cacheKey: string): Promise<string | null> {
  const client = getClient();
  const row = await client.execute({
    sql: "SELECT value, expires_at FROM api_cache WHERE cache_key = ? AND expires_at > ?",
    args: [cacheKey, Date.now()],
  });
  if (row.rows.length === 0) return null;
  return row.rows[0].value as string;
}

export async function setCachedValue(
  cacheKey: string,
  value: string,
  ttlMs: number,
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "INSERT OR REPLACE INTO api_cache (cache_key, value, expires_at) VALUES (?, ?, ?)",
    args: [cacheKey, value, Date.now() + ttlMs],
  });
}

export async function cleanupExpiredCache(): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: "DELETE FROM api_cache WHERE expires_at <= ?",
    args: [Date.now()],
  });
}
