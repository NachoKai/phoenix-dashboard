import { decrypt, getEncryptionKey } from "../config/encryption.js";
import { getEncryptedKey } from "../db/index.js";

export function resolveApiKey(
  widgetId: string | undefined,
  keyName: string,
  fallbackEnvKey: string,
): string | null {
  if (widgetId) {
    const stored = getEncryptedKey(widgetId, keyName);
    if (stored) {
      try {
        return decrypt(stored, getEncryptionKey());
      } catch {
        console.error("[api] Failed to decrypt API key");
        /* fall through */
      }
    }
  }
  return process.env[fallbackEnvKey] ?? null;
}
