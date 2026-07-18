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

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
