import { decrypt, getEncryptionKey } from "../config/encryption.js";
import { getEncryptedKey } from "../db/index.js";

export async function resolveApiKey(
  widgetId: string | undefined,
  keyName: string,
  fallbackEnvKey: string,
): Promise<string | null> {
  if (widgetId) {
    const stored = await getEncryptedKey(widgetId, keyName);
    if (stored) {
      try {
        return decrypt(stored, getEncryptionKey());
      } catch {
        console.error("[api] Failed to decrypt API key");
      }
    }
  }
  return process.env[fallbackEnvKey] ?? null;
}
