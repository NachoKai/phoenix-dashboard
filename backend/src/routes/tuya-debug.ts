import { Router, type Request, type Response } from "express";
import {
  getAllDevices,
  getDeviceStatus,
  getTokenInfo,
  tuyaGet,
} from "../widgets/tuya/client.js";

export const tuyaDebugRouter = Router();

type AsyncHandler = (req: Request, res: Response) => void | Promise<void>;

function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error("[tuya-debug] Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

tuyaDebugRouter.get(
  "/",
  wrap(async (_req, res) => {
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
  }),
);
