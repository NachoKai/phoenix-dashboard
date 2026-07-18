import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR =
  process.env.DATA_DIR || path.resolve(path.dirname(__filename), "../../data");

const PERSIST_FILE = path.join(DATA_DIR, "dashboard-state.json");
const KEYS_FILE = path.join(DATA_DIR, "encrypted-keys.json");

let client: ReturnType<typeof createClient>;

export async function initDatabase(): Promise<void> {
  const url =
    process.env.TURSO_DATABASE_URL ||
    `file:${path.join(DATA_DIR, "dashboard.db")}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient(authToken ? { url, authToken } : { url });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS device_state (
        device_id TEXT PRIMARY KEY NOT NULL,
        widgets TEXT NOT NULL DEFAULT '[]',
        sections TEXT NOT NULL DEFAULT '[]',
        global_settings TEXT NOT NULL DEFAULT '{}',
        last_modified INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS encrypted_keys (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS api_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
    ],
    "write",
  );

  await migrateFromJsonIfNeeded();
}

export function getClient(): ReturnType<typeof createClient> {
  return client;
}

async function migrateFromJsonIfNeeded(): Promise<void> {
  const result = await client.execute(
    "SELECT COUNT(*) as count FROM device_state",
  );
  if (result.rows[0].count as number > 0) return;

  const persistRaw = tryReadFile(PERSIST_FILE);
  if (!persistRaw) return;

  try {
    const parsed = JSON.parse(persistRaw);
    const devices: Record<string, unknown> = parsed.devices ?? {
      _migrated_: parsed,
    };

    const stmt =
      "INSERT INTO device_state (device_id, widgets, sections, global_settings, last_modified) VALUES (?, ?, ?, ?, ?)";
    for (const [deviceId, data] of Object.entries(devices)) {
      const d = data as Record<string, unknown>;
      await client.execute({
        sql: stmt,
        args: [
          deviceId,
          JSON.stringify(d.widgets ?? []),
          JSON.stringify(d.sections ?? []),
          JSON.stringify(d.globalSettings ?? {}),
          (d.lastModified as number) ?? Date.now(),
        ],
      });
    }

    const keysRaw = tryReadFile(KEYS_FILE);
    if (keysRaw) {
      const keys = JSON.parse(keysRaw) as Record<string, string>;
      const keyStmt =
        "INSERT OR REPLACE INTO encrypted_keys (key, value) VALUES (?, ?)";
      for (const [k, v] of Object.entries(keys)) {
        await client.execute({ sql: keyStmt, args: [k, v] });
      }
      renameToBak(KEYS_FILE);
    }

    renameToBak(PERSIST_FILE);
    console.info("[turso] Migrated data from JSON files");
  } catch (err) {
    console.error("[turso] Migration failed:", err);
  }
}

function tryReadFile(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || (typeof parsed === "object" && Object.keys(parsed).length === 0))
      return null;
    return raw;
  } catch {
    return null;
  }
}

function renameToBak(filePath: string): void {
  try {
    fs.renameSync(filePath, filePath + ".bak");
  } catch {
    // ignore
  }
}
