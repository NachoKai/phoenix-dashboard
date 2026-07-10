import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DashboardState, GlobalSettings, WidgetInstance } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/dashboard.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS widgets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      position INTEGER NOT NULL,
      config TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS encrypted_keys (
      widget_id TEXT NOT NULL,
      key_name TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      PRIMARY KEY (widget_id, key_name),
      FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  const count = database.prepare('SELECT COUNT(*) as c FROM widgets').get() as { c: number };
  if (count.c === 0) {
    seedDefaults(database);
  }
}

function seedDefaults(database: Database.Database) {
  const defaults: GlobalSettings = {
    theme: 'dark',
    defaultRefreshInterval: 60,
  };
  database.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)').run(
    'settings',
    JSON.stringify(defaults),
  );

  const widgets: WidgetInstance[] = [
    {
      id: 'clock-1',
      type: 'clock',
      position: 0,
      config: { format: '24h', timezone: 'local', showSeconds: true },
    },
    {
      id: 'weather-1',
      type: 'weather',
      position: 1,
      config: { location: 'London', units: 'metric', refreshInterval: 600 },
    },
    {
      id: 'gifs-1',
      type: 'gifs',
      position: 2,
      config: {
        source: 'static',
        urls: [
          'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
          'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        ],
        rotationInterval: 30,
        tag: 'nature',
      },
    },
  ];

  const insert = database.prepare(
    'INSERT INTO widgets (id, type, position, config) VALUES (?, ?, ?, ?)',
  );
  for (const w of widgets) {
    insert.run(w.id, w.type, w.position, JSON.stringify(w.config));
  }
}

export function getGlobalSettings(): GlobalSettings {
  const row = getDb()
    .prepare('SELECT value FROM global_settings WHERE key = ?')
    .get('settings') as { value: string } | undefined;
  if (!row) {
    return { theme: 'dark', defaultRefreshInterval: 60 };
  }
  return JSON.parse(row.value) as GlobalSettings;
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)')
    .run('settings', JSON.stringify(settings));
}

export function getWidgets(): WidgetInstance[] {
  const rows = getDb()
    .prepare('SELECT id, type, position, config FROM widgets ORDER BY position ASC')
    .all() as { id: string; type: string; position: number; config: string }[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    position: r.position,
    config: JSON.parse(r.config),
  }));
}

export function getDashboardState(): DashboardState {
  return {
    widgets: getWidgets(),
    globalSettings: getGlobalSettings(),
  };
}

export function saveWidgets(widgets: WidgetInstance[]): void {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare('DELETE FROM widgets').run();
    const insert = database.prepare(
      'INSERT INTO widgets (id, type, position, config) VALUES (?, ?, ?, ?)',
    );
    widgets.forEach((w, i) => {
      insert.run(w.id, w.type, i, JSON.stringify(w.config));
    });
  });
  tx();
}

export function saveEncryptedKey(widgetId: string, keyName: string, encrypted: string): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO encrypted_keys (widget_id, key_name, encrypted_value)
       VALUES (?, ?, ?)`,
    )
    .run(widgetId, keyName, encrypted);
}

export function getEncryptedKey(widgetId: string, keyName: string): string | null {
  const row = getDb()
    .prepare('SELECT encrypted_value FROM encrypted_keys WHERE widget_id = ? AND key_name = ?')
    .get(widgetId, keyName) as { encrypted_value: string } | undefined;
  return row?.encrypted_value ?? null;
}

export function deleteEncryptedKeysForWidget(widgetId: string): void {
  getDb().prepare('DELETE FROM encrypted_keys WHERE widget_id = ?').run(widgetId);
}

export function getCachedValue(cacheKey: string): string | null {
  const row = getDb()
    .prepare('SELECT value, expires_at FROM api_cache WHERE cache_key = ?')
    .get(cacheKey) as { value: string; expires_at: number } | undefined;
  if (!row) return null;
  if (Date.now() > row.expires_at) {
    getDb().prepare('DELETE FROM api_cache WHERE cache_key = ?').run(cacheKey);
    return null;
  }
  return row.value;
}

export function setCachedValue(cacheKey: string, value: string, ttlMs: number): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO api_cache (cache_key, value, expires_at) VALUES (?, ?, ?)`,
    )
    .run(cacheKey, value, Date.now() + ttlMs);
}

export function cleanupExpiredCache(): void {
  getDb().prepare('DELETE FROM api_cache WHERE expires_at < ?').run(Date.now());
}
