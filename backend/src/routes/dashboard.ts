import { Router, type Request, type Response } from "express";
import {
  addSection,
  deleteSection,
  getDashboardState,
  getSections,
  getWidgets,
  saveDashboardState,
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

export const dashboardRouter = Router();

type AsyncHandler = (req: Request, res: Response) => void | Promise<void>;

function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error("[dashboard] Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

function getDeviceId(req: { query: { deviceId?: string } }): string | null {
  return req.query.deviceId ?? null;
}

dashboardRouter.get(
  "/",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
    const state = await getDashboardState(deviceId);
    res.json(state);
  }),
);

dashboardRouter.put(
  "/",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
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

dashboardRouter.put(
  "/widgets",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
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

dashboardRouter.get(
  "/sections",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
    const sections = await getSections(deviceId);
    res.json(sections);
  }),
);

dashboardRouter.post(
  "/sections",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
    const section = await addSection(deviceId);
    res.json({ ok: true, section });
  }),
);

dashboardRouter.put(
  "/sections/reorder",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
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

dashboardRouter.delete(
  "/sections/:id",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
    const ok = await deleteSection(deviceId, String(req.params.id));
    if (!ok) {
      res.status(400).json({ error: "Cannot delete last section" });
      return;
    }
    res.json({ ok: true });
  }),
);

dashboardRouter.put(
  "/settings",
  wrap(async (req, res) => {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId required" });
      return;
    }
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
