import { Router } from "express";
import { aiQaHandler } from "../widgets/ai-qa/route.js";
import { gifsHandler } from "../widgets/gifs/route.js";
import { lightsControlHandler, lightsListHandler } from "../widgets/lights/route.js";
import { widgetRegistry } from "../widgets/registry.js";
import { vacuumControlHandler, vacuumStatusHandler } from "../widgets/vacuum/route.js";
import { weatherHandler } from "../widgets/weather/route.js";
import { weatherWeeklyHandler } from "../widgets/weather/weeklyRoute.js";
import { dashboardRouter } from "./dashboard.js";
import { keysRouter } from "./keys.js";
import { tuyaDebugRouter } from "./tuya-debug.js";
import { getClient } from "../db/turso.js";
import { getTokenInfo } from "../widgets/tuya/client.js";

const SERVER_START = Date.now();
const VERSION = process.env.npm_package_version ?? "0.1.0";

export const apiRouter: import("express").Router = Router();

// ── Lightweight health (DB + memory) ──
apiRouter.get("/health", async (_req, res) => {
  const uptimeMs = Date.now() - SERVER_START;
  const mem = process.memoryUsage();

  let dbOk = true;
  try {
    await getClient().execute("SELECT 1");
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? "ok" : "degraded",
    version: VERSION,
    uptime: Math.floor(uptimeMs / 1000),
    timestamp: new Date().toISOString(),
    db: dbOk ? "connected" : "unreachable",
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

// ── Deep health: checks all external dependencies ──
interface DependencyCheck {
  name: string;
  configured: boolean;
  reachable?: boolean;
  latencyMs?: number;
  error?: string;
}

async function checkExternal(
  name: string,
  url: string,
  timeoutMs = 5000,
): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, method: "HEAD" });
    clearTimeout(timer);
    return { name, configured: true, reachable: res.ok || res.status < 500, latencyMs: Date.now() - start };
  } catch (err) {
    return { name, configured: true, reachable: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

apiRouter.get("/health/deep", async (_req, res) => {
  const uptimeMs = Date.now() - SERVER_START;
  const mem = process.memoryUsage();

  // DB check with latency
  const dbStart = Date.now();
  let dbOk = true;
  try {
    await getClient().execute("SELECT 1");
  } catch {
    dbOk = false;
  }
  const dbLatency = Date.now() - dbStart;

  // Check which external API keys are configured
  const weatherKey = process.env.OPENWEATHER_API_KEY;
  const giphyKey = process.env.GIPHY_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const tuyaId = process.env.TUYA_ACCESS_ID;
  const tuyaSecret = process.env.TUYA_ACCESS_SECRET;

  // Build dependency checks — only ping services whose keys are configured
  const checks: DependencyCheck[] = [
    { name: "database", configured: true, reachable: dbOk, latencyMs: dbLatency },
  ];

  if (weatherKey) {
    checks.push(await checkExternal("openweathermap", "https://api.openweathermap.org/data/2.5/weather?q=London&appid=" + weatherKey));
  } else {
    checks.push({ name: "openweathermap", configured: false });
  }

  if (giphyKey) {
    checks.push(await checkExternal("giphy", `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=test&limit=1`));
  } else {
    checks.push({ name: "giphy", configured: false });
  }

  if (openrouterKey) {
    checks.push(await checkExternal("openrouter", "https://openrouter.ai/api/v1/models"));
  } else {
    checks.push({ name: "openrouter", configured: false });
  }

  if (tuyaId && tuyaSecret) {
    const tuyaStart = Date.now();
    try {
      await getTokenInfo();
      checks.push({ name: "tuya", configured: true, reachable: true, latencyMs: Date.now() - tuyaStart });
    } catch (err) {
      checks.push({ name: "tuya", configured: true, reachable: false, latencyMs: Date.now() - tuyaStart, error: (err as Error).message });
    }
  } else {
    checks.push({ name: "tuya", configured: false });
  }

  const allOk = checks.every(c => c.configured ? c.reachable !== false : true);
  const status = allOk ? 200 : 503;

  res.status(status).json({
    status: allOk ? "ok" : "degraded",
    version: VERSION,
    uptime: Math.floor(uptimeMs / 1000),
    timestamp: new Date().toISOString(),
    db: dbOk ? "connected" : "unreachable",
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    dependencies: checks,
  });
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

apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/dashboard/keys", keysRouter);

apiRouter.get("/weather", weatherHandler);
apiRouter.get("/weather-weekly", weatherWeeklyHandler);
apiRouter.get("/gifs", gifsHandler);
apiRouter.post("/ask", aiQaHandler);
apiRouter.get("/lights/devices", lightsListHandler);
apiRouter.post("/lights/control", lightsControlHandler);
apiRouter.get("/vacuum/status", vacuumStatusHandler);
apiRouter.post("/vacuum/control", vacuumControlHandler);

apiRouter.use("/tuya/debug", tuyaDebugRouter);
