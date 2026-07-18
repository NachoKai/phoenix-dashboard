import { Router, type Request, type Response } from "express";
import { decrypt, encrypt, getEncryptionKey, maskSecret } from "../config/encryption.js";
import {
  addSection,
  deleteEncryptedKeysForWidget,
  deleteSection,
  getDashboardState,
  getEncryptedKey,
  getSections,
  getWidgets,
  saveDashboardState,
  saveEncryptedKey,
  saveGlobalSettings,
  saveSections,
  saveWidgets,
} from "../db/index.js";
import type {
  DashboardSection,
  DashboardState,
  GlobalSettings,
  WidgetInstance,
} from "../types.js";
import { getWidgetDefinition, widgetRegistry } from "../widgets/registry.js";
import { aiQaHandler } from "../widgets/ai-qa/route.js";
import { gifsHandler } from "../widgets/gifs/route.js";
import { weatherHandler } from "../widgets/weather/route.js";
import { weatherWeeklyHandler } from "../widgets/weather/weeklyRoute.js";
import { lightsListHandler, lightsControlHandler } from "../widgets/lights/route.js";
import { vacuumStatusHandler, vacuumControlHandler } from "../widgets/vacuum/route.js";
import {
  getAllDevices,
  getDeviceStatus,
  getTokenInfo,
  tuyaGet,
  tuyaPost,
} from "../widgets/tuya/client.js";

export const apiRouter = Router();

type AsyncHandler = (req: Request, res: Response) => void | Promise<void>;

function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error("[api] Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

function getDeviceId(req: { query: { deviceId?: string } }): string | null {
  return req.query.deviceId ?? null;
}

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.get(
  "/dashboard",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const state = await getDashboardState(deviceId);
    res.json(state);
  }),
);

apiRouter.put(
  "/dashboard",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const state = req.body as DashboardState;
    if (!state.widgets || !state.sections || !state.globalSettings) {
      res.status(400).json({
        error: "Full dashboard state required (widgets, sections, globalSettings)",
      });
      return;
    }
    await saveDashboardState(deviceId, state);
    const saved = await getDashboardState(deviceId);
    res.json({ ok: true, lastModified: saved.lastModified });
  }),
);

apiRouter.get("/widgets/registry", (_req, res) => {
  res.json(
    widgetRegistry.map(w => ({
      type: w.type,
      name: w.name,
      description: w.description,
      configSchema: w.configSchema,
      defaultConfig: w.defaultConfig,
      hasBackendRoute: w.hasBackendRoute,
    })),
  );
});

apiRouter.put(
  "/dashboard/widgets",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const widgets = req.body.widgets as WidgetInstance[];
    if (!Array.isArray(widgets)) {
      res.status(400).json({ error: "widgets array required" });
      return;
    }
    await saveWidgets(deviceId, widgets);
    const saved = await getWidgets(deviceId);
    res.json({ ok: true, widgets: saved });
  }),
);

// ── Section management ──

apiRouter.get(
  "/dashboard/sections",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const sections = await getSections(deviceId);
    res.json(sections);
  }),
);

apiRouter.post(
  "/dashboard/sections",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const section = await addSection(deviceId);
    res.json({ ok: true, section });
  }),
);

apiRouter.put(
  "/dashboard/sections/reorder",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const sections = req.body.sections as DashboardSection[];
    if (!Array.isArray(sections)) {
      res.status(400).json({ error: "sections array required" });
      return;
    }
    await saveSections(deviceId, sections);
    const saved = await getSections(deviceId);
    res.json({ ok: true, sections: saved });
  }),
);

apiRouter.delete(
  "/dashboard/sections/:id",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const ok = await deleteSection(deviceId, String(req.params.id));
    if (!ok) {
      res.status(400).json({ error: "Cannot delete last section" });
      return;
    }
    res.json({ ok: true });
  }),
);

// ── Settings ──

apiRouter.put(
  "/dashboard/settings",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
    const settings = req.body as GlobalSettings;
    if (!settings.theme || settings.defaultRefreshInterval == null) {
      res.status(400).json({ error: "Invalid settings" });
      return;
    }
    await saveGlobalSettings(deviceId, {
      ...settings,
      sleepStartHour: Math.max(0, Math.min(23, settings.sleepStartHour ?? 23)),
      sleepStartMinute: Math.max(0, Math.min(59, settings.sleepStartMinute ?? 0)),
      sleepEndHour: Math.max(0, Math.min(23, settings.sleepEndHour ?? 7)),
      sleepEndMinute: Math.max(0, Math.min(59, settings.sleepEndMinute ?? 0)),
    });
    res.json({ ok: true, settings });
  }),
);

// ── API keys ──

apiRouter.post(
  "/dashboard/keys",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) { res.status(400).json({ error: "deviceId required" }); return; }
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

apiRouter.get(
  "/dashboard/keys/:widgetId/:keyName",
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
      console.error("[api] Failed to decrypt key", widgetId, keyName);
      res.json({ hasValue: true, masked: "****" });
    }
  }),
);

apiRouter.delete(
  "/dashboard/keys/:widgetId",
  wrap(async (req, res) => {
    await deleteEncryptedKeysForWidget(String(req.params.widgetId));
    res.json({ ok: true });
  }),
);

apiRouter.get("/weather", weatherHandler);
apiRouter.get("/weather-weekly", weatherWeeklyHandler);
apiRouter.get("/gifs", gifsHandler);
apiRouter.post("/ask", aiQaHandler);

apiRouter.get("/lights/devices", lightsListHandler);
apiRouter.post("/lights/control", lightsControlHandler);
apiRouter.get("/vacuum/status", vacuumStatusHandler);
apiRouter.post("/vacuum/control", vacuumControlHandler);

apiRouter.get("/tuya/debug", async (_req, res) => {
  const VACUUM_ID = "eba151d8cfa3fec78dkdgx";
  const LIGHT_ID = "eba91d2bbc51684b06cifi";

  const [tokenResult, devicesResult, vacuumResult, lightResult, specResult] =
    await Promise.allSettled([
      getTokenInfo(),
      getAllDevices(),
      getDeviceStatus(VACUUM_ID),
      getDeviceStatus(LIGHT_ID),
      tuyaGet(`/v1.0/iot-03/devices/${VACUUM_ID}/specification`),
    ]);

  res.json({
    token:
      tokenResult.status === "fulfilled"
        ? { ok: true, ...tokenResult.value }
        : { ok: false, error: String(tokenResult.reason) },
    devices:
      devicesResult.status === "fulfilled"
        ? { ok: true, count: devicesResult.value.length, devices: devicesResult.value }
        : { ok: false, error: String(devicesResult.reason) },
    vacuumDirect:
      vacuumResult.status === "fulfilled"
        ? { ok: true, device: vacuumResult.value }
        : { ok: false, error: String(vacuumResult.reason) },
    lightDirect:
      lightResult.status === "fulfilled"
        ? { ok: true, device: lightResult.value }
        : { ok: false, error: String(lightResult.reason) },
    vacuumSpec:
      specResult.status === "fulfilled"
        ? { ok: true, spec: specResult.value }
        : { ok: false, error: String(specResult.reason) },
  });
});
