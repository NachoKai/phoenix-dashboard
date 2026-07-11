import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import type {
  DashboardSection,
  DashboardState,
  GlobalSettings,
  WidgetInstance,
} from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "../../data/dashboard.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
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

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      flex REAL NOT NULL DEFAULT 1,
      layout TEXT NOT NULL DEFAULT 'full-width'
    );

    CREATE TABLE IF NOT EXISTS widgets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      position INTEGER NOT NULL,
      section TEXT NOT NULL DEFAULT 'default',
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

  // Ensure section columns exist for older databases
  const cols = database.prepare("PRAGMA table_info(sections)").all() as {
    name: string;
  }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes("flex")) {
    database.exec("ALTER TABLE sections ADD COLUMN flex REAL NOT NULL DEFAULT 1");
  }
  if (!colNames.includes("layout")) {
    database.exec(
      "ALTER TABLE sections ADD COLUMN layout TEXT NOT NULL DEFAULT 'full-width'",
    );
    // Migrate old 'paired' boolean to new 'layout' enum
    if (colNames.includes("paired")) {
      database.exec("UPDATE sections SET layout = 'right' WHERE paired = 1");
    }
  }

  const widgetCols = database.prepare("PRAGMA table_info(widgets)").all() as {
    name: string;
  }[];
  const widgetColNames = widgetCols.map(c => c.name);
  if (!widgetColNames.some(n => n === "section")) {
    database.exec(
      "ALTER TABLE widgets ADD COLUMN section TEXT NOT NULL DEFAULT 'default'",
    );
  }

  const sectionCount = database.prepare("SELECT COUNT(*) as c FROM sections").get() as {
    c: number;
  };
  if (sectionCount.c === 0) {
    seedDefaults(database);
  }
}

function seedDefaults(database: Database.Database) {
  const defaults: GlobalSettings = {
    theme: "dark",
    defaultRefreshInterval: 60,
    orientation: "auto",
  };
  database
    .prepare("INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)")
    .run("settings", JSON.stringify(defaults));

  database
    .prepare(
      "INSERT INTO sections (id, flex, layout, name, position) VALUES (?, ?, ?, ?, ?)",
    )
    .run("default", 1, "full-width", "Dashboard", 0);

  const widgets: WidgetInstance[] = [
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
      position: 1,
      section: "default",
      config: { location: "London", units: "metric", refreshInterval: 600 },
    },
    {
      id: "gifs-1",
      type: "gifs",
      position: 2,
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

  const insert = database.prepare(
    "INSERT INTO widgets (id, type, position, section, config) VALUES (?, ?, ?, ?, ?)",
  );
  for (const w of widgets) {
    insert.run(w.id, w.type, w.position, w.section, JSON.stringify(w.config));
  }
}

export function getGlobalSettings(): GlobalSettings {
  const row = getDb()
    .prepare("SELECT value FROM global_settings WHERE key = ?")
    .get("settings") as { value: string } | undefined;
  if (!row) {
    return { theme: "dark", defaultRefreshInterval: 60, orientation: "auto" };
  }
  return JSON.parse(row.value) as GlobalSettings;
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)")
    .run("settings", JSON.stringify(settings));
}

export function getSections(): DashboardSection[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, position, flex, layout FROM sections ORDER BY position ASC",
    )
    .all() as {
    id: string;
    name: string;
    position: number;
    flex: number;
    layout: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    position: r.position,
    flex: r.flex,
    layout: r.layout as DashboardSection["layout"],
  }));
}

export function saveSections(sections: DashboardSection[]): void {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare("DELETE FROM sections").run();
    const insert = database.prepare(
      "INSERT INTO sections (id, name, position, flex, layout) VALUES (?, ?, ?, ?, ?)",
    );
    for (const s of sections) {
      insert.run(s.id, s.name, s.position, s.flex ?? 1, s.layout ?? "full-width");
    }
  });
  tx();
}

export function addSection(): DashboardSection {
  const sections = getSections();
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
  getDb()
    .prepare(
      "INSERT INTO sections (id, name, position, flex, layout) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, name, section.position, 1, "full-width");
  return section;
}

export function renameSection(id: string, name: string): boolean {
  const result = getDb()
    .prepare("UPDATE sections SET name = ? WHERE id = ?")
    .run(name, id);
  return result.changes > 0;
}

export function deleteSection(id: string): boolean {
  const database = getDb();
  const sections = getSections();
  if (sections.length <= 1) return false;

  const tx = database.transaction(() => {
    const targetSection = sections.find(s => s.id !== id);
    if (targetSection) {
      database
        .prepare("UPDATE widgets SET section = ? WHERE section = ?")
        .run(targetSection.id, id);
    }
    database.prepare("DELETE FROM sections WHERE id = ?").run(id);
    const remaining = getSections();
    remaining.forEach((s, i) => {
      database.prepare("UPDATE sections SET position = ? WHERE id = ?").run(i, s.id);
    });
  });
  tx();
  return true;
}

export function getWidgets(): WidgetInstance[] {
  const rows = getDb()
    .prepare(
      "SELECT id, type, position, section, config FROM widgets ORDER BY position ASC",
    )
    .all() as {
    id: string;
    type: string;
    position: number;
    section: string;
    config: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    type: r.type,
    position: r.position,
    section: r.section,
    config: JSON.parse(r.config),
  }));
}

export function getDashboardState(): DashboardState {
  return {
    widgets: getWidgets(),
    sections: getSections(),
    globalSettings: getGlobalSettings(),
  };
}

export function saveWidgets(widgets: WidgetInstance[]): void {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare("DELETE FROM widgets").run();
    const insert = database.prepare(
      "INSERT INTO widgets (id, type, position, section, config) VALUES (?, ?, ?, ?, ?)",
    );
    widgets.forEach(w => {
      insert.run(w.id, w.type, w.position, w.section, JSON.stringify(w.config));
    });
  });
  tx();
}

export function saveEncryptedKey(
  widgetId: string,
  keyName: string,
  encrypted: string,
): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO encrypted_keys (widget_id, key_name, encrypted_value)
       VALUES (?, ?, ?)`,
    )
    .run(widgetId, keyName, encrypted);
}

export function getEncryptedKey(widgetId: string, keyName: string): string | null {
  const row = getDb()
    .prepare(
      "SELECT encrypted_value FROM encrypted_keys WHERE widget_id = ? AND key_name = ?",
    )
    .get(widgetId, keyName) as { encrypted_value: string } | undefined;
  return row?.encrypted_value ?? null;
}

export function deleteEncryptedKeysForWidget(widgetId: string): void {
  getDb().prepare("DELETE FROM encrypted_keys WHERE widget_id = ?").run(widgetId);
}

export function getCachedValue(cacheKey: string): string | null {
  const row = getDb()
    .prepare("SELECT value, expires_at FROM api_cache WHERE cache_key = ?")
    .get(cacheKey) as { value: string; expires_at: number } | undefined;
  if (!row) return null;
  if (Date.now() > row.expires_at) {
    getDb().prepare("DELETE FROM api_cache WHERE cache_key = ?").run(cacheKey);
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
  getDb().prepare("DELETE FROM api_cache WHERE expires_at < ?").run(Date.now());
}
