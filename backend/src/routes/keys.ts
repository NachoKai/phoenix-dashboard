import { Router, type Request, type Response } from "express";
import { decrypt, encrypt, getEncryptionKey, maskSecret } from "../config/encryption.js";
import {
  deleteEncryptedKeysForWidget,
  getEncryptedKey,
  getWidgets,
  saveEncryptedKey,
} from "../db/index.js";
import { getWidgetDefinition } from "../widgets/registry.js";

export const keysRouter = Router();

type AsyncHandler = (req: Request, res: Response) => void | Promise<void>;

function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error("[keys] Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

keysRouter.post(
  "/",
  wrap(async (req, res) => {
    const deviceId = (req.query.deviceId as string) ?? null;
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
    const { widgetId, keyName, value } = req.body as {
      widgetId: string;
      keyName: string;
      value: string;
    };
    if (!widgetId || !keyName || !value) {
      res.status(400).json({ error: "widgetId, keyName, and value required" });
      return;
    }

    const widgets = await getWidgets(deviceId);
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) {
      res.status(404).json({ error: "Widget not found" });
      return;
    }

    const def = getWidgetDefinition(widget.type);
    const field = def?.configSchema.find(f => f.key === keyName && f.type === "secret");
    if (!field) {
      res.status(400).json({ error: "Invalid secret key field" });
      return;
    }

    const encrypted = encrypt(value, getEncryptionKey());
    await saveEncryptedKey(widgetId, keyName, encrypted);
    res.json({ ok: true, masked: maskSecret(value) });
  }),
);

keysRouter.get(
  "/:widgetId/:keyName",
  wrap(async (req, res) => {
    const widgetId = String(req.params.widgetId);
    const keyName = String(req.params.keyName);
    const stored = await getEncryptedKey(widgetId, keyName);
    if (!stored) {
      res.json({ hasValue: false });
      return;
    }
    try {
      const decrypted = decrypt(stored, getEncryptionKey());
      res.json({ hasValue: true, masked: maskSecret(decrypted) });
    } catch {
      console.error("[keys] Failed to decrypt key", widgetId, keyName);
      res.json({ hasValue: true, masked: "****" });
    }
  }),
);

keysRouter.delete(
  "/:widgetId",
  wrap(async (req, res) => {
    await deleteEncryptedKeysForWidget(String(req.params.widgetId));
    res.json({ ok: true });
  }),
);
