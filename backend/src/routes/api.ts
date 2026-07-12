import { Router } from "express";
import { decrypt, encrypt, getEncryptionKey, maskSecret } from "../config/encryption.js";
import {
  addSection,
  deleteEncryptedKeysForWidget,
  deleteSection,
  getDashboardState,
  getEncryptedKey,
  getSections,
  getWidgets,
  saveEncryptedKey,
  saveGlobalSettings,
  saveSections,
  saveWidgets,
} from "../db/index.js";
import type { DashboardSection, GlobalSettings, WidgetInstance } from "../types.js";
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

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.get("/dashboard", (_req, res) => {
  res.json(getDashboardState());
});

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

apiRouter.put("/dashboard/widgets", (req, res) => {
  const widgets = req.body.widgets as WidgetInstance[];
  if (!Array.isArray(widgets)) {
    res.status(400).json({ error: "widgets array required" });
    return;
  }
  saveWidgets(widgets);
  res.json({ ok: true, widgets: getWidgets() });
});

// ── Section management ──

apiRouter.get("/dashboard/sections", (_req, res) => {
  res.json(getSections());
});

apiRouter.post("/dashboard/sections", (_req, res) => {
  const section = addSection();
  res.json({ ok: true, section });
});

apiRouter.put("/dashboard/sections/reorder", (req, res) => {
  const sections = req.body.sections as DashboardSection[];
  if (!Array.isArray(sections)) {
    res.status(400).json({ error: "sections array required" });
    return;
  }
  saveSections(sections);
  res.json({ ok: true, sections: getSections() });
});

apiRouter.delete("/dashboard/sections/:id", (req, res) => {
  const ok = deleteSection(req.params.id);
  if (!ok) {
    res.status(400).json({ error: "Cannot delete last section" });
    return;
  }
  res.json({ ok: true });
});

// ── Settings ──

apiRouter.put("/dashboard/settings", (req, res) => {
  const settings = req.body as GlobalSettings;
  if (!settings.theme || settings.defaultRefreshInterval == null) {
    res.status(400).json({ error: "Invalid settings" });
    return;
  }
  saveGlobalSettings({
    ...settings,
    sleepStartHour: Math.max(0, Math.min(23, settings.sleepStartHour ?? 23)),
    sleepStartMinute: Math.max(0, Math.min(59, settings.sleepStartMinute ?? 0)),
    sleepEndHour: Math.max(0, Math.min(23, settings.sleepEndHour ?? 7)),
    sleepEndMinute: Math.max(0, Math.min(59, settings.sleepEndMinute ?? 0)),
  });
  res.json({ ok: true, settings });
});

// ── API keys ──

apiRouter.post("/dashboard/keys", (req, res) => {
  const { widgetId, keyName, value } = req.body as {
    widgetId: string;
    keyName: string;
    value: string;
  };
  if (!widgetId || !keyName || !value) {
    res.status(400).json({ error: "widgetId, keyName, and value required" });
    return;
  }

  const widget = getWidgets().find(w => w.id === widgetId);
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
  saveEncryptedKey(widgetId, keyName, encrypted);
  res.json({ ok: true, masked: maskSecret(value) });
});

apiRouter.get("/dashboard/keys/:widgetId/:keyName", (req, res) => {
  const { widgetId, keyName } = req.params;
  const stored = getEncryptedKey(widgetId, keyName);
  if (!stored) {
    res.json({ hasValue: false });
    return;
  }
  try {
    const decrypted = decrypt(stored, getEncryptionKey());
    res.json({ hasValue: true, masked: maskSecret(decrypted) });
  } catch {
    res.json({ hasValue: true, masked: "****" });
  }
});

apiRouter.delete("/dashboard/keys/:widgetId", (req, res) => {
  deleteEncryptedKeysForWidget(req.params.widgetId);
  res.json({ ok: true });
});

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
