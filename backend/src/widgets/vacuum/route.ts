import type { Request, Response } from "express";
import { getAllDevices, sendDeviceCommand, getDeviceStatus } from "../tuya/client.js";

export interface VacuumStatus {
  id: string;
  name: string;
  online: boolean;
  isOn: boolean;
  isCleaning: boolean;
  battery: number;
  status: string;
  fanSpeed: string;
  area: number;
  time: number;
  errorCode: number;
}

const VACUUM_STATES: Record<number, string> = {
  0: "Idle",
  1: "Sleeping",
  2: "Sweeping",
  3: "Returning",
  4: "Charging",
  5: "Paused",
  6: "Error",
  7: "Manual Control",
  8: "Standby",
  9: "Mapping",
  10: "Firmware Updating",
};

const FAN_SPEEDS: Record<number, string> = {
  0: "Quiet",
  1: "Standard",
  2: "Strong",
  3: "Max",
};

function parseVacuumStatus(device: {
  status: { code: string; value: unknown }[];
}): Omit<VacuumStatus, "id" | "name" | "online"> {
  let isOn = false;
  let isCleaning = false;
  let battery = 0;
  let status = "Unknown";
  let fanSpeed = "Standard";
  let area = 0;
  let time = 0;
  let errorCode = 0;

  for (const dp of device.status) {
    switch (dp.code) {
      case "switch":
      case "power_go":
        isOn = dp.value === true;
        break;
      case "mode":
      case "sweep_mode": {
        if (typeof dp.value === "string") {
          isCleaning =
            dp.value === "smart" ||
            dp.value === "wall_follow" ||
            dp.value === "mop" ||
            dp.value === "spiral";
        } else {
          const v = typeof dp.value === "number" ? dp.value : 0;
          isCleaning = v === 1 || v === 2;
        }
        break;
      }
      case "battery_status":
      case "battery":
      case "electricity_left":
        battery = typeof dp.value === "number" ? dp.value : 0;
        break;
      case "status":
      case "sweep_status": {
        if (typeof dp.value === "string") {
          status = dp.value.charAt(0).toUpperCase() + dp.value.slice(1);
          isCleaning = [
            "smart_clean",
            "wall_clean",
            "spot_clean",
            "mop_clean",
            "sweep",
            "cleaning",
          ].includes(dp.value);
        } else {
          const code = typeof dp.value === "number" ? dp.value : 0;
          status = VACUUM_STATES[code] ?? `State ${code}`;
          isCleaning = code === 2;
        }
        break;
      }
      case "suction":
      case "suction_level":
      case "fan_speed": {
        if (typeof dp.value === "string") {
          fanSpeed = dp.value.charAt(0).toUpperCase() + dp.value.slice(1);
        } else {
          const code = typeof dp.value === "number" ? dp.value : 1;
          fanSpeed = FAN_SPEEDS[code] ?? `Level ${code}`;
        }
        break;
      }
      case "clean_area":
        area = typeof dp.value === "number" ? dp.value : 0;
        break;
      case "clean_time":
        time = typeof dp.value === "number" ? dp.value : 0;
        break;
      case "fault":
      case "error_code":
        errorCode = typeof dp.value === "number" ? dp.value : 0;
        break;
    }
  }

  return { isOn, isCleaning, battery, status, fanSpeed, area, time, errorCode };
}

export async function vacuumStatusHandler(req: Request, res: Response) {
  try {
    const deviceId = req.query.deviceId as string | undefined;

    if (deviceId) {
      const device = await getDeviceStatus(deviceId);
      const parsed = parseVacuumStatus(device);
      res.json({
        id: device.id,
        name: device.name,
        online: device.online,
        ...parsed,
      });
      return;
    }

    const devices = await getAllDevices();
    const vacuums = devices.filter(
      d =>
        d.category === "vacuum" ||
        d.category === "sd" ||
        d.name.toLowerCase().includes("vacuum") ||
        d.name.toLowerCase().includes("robot") ||
        d.product_name.toLowerCase().includes("vacuum") ||
        d.product_name.toLowerCase().includes("sweep") ||
        d.product_name.toLowerCase().includes("clean") ||
        d.status.some(
          s =>
            s.code === "power_go" ||
            s.code === "electricity_left" ||
            s.code === "clean_area" ||
            s.code === "clean_time" ||
            s.code === "suction",
        ),
    );

    const result: VacuumStatus[] = vacuums.map(d => {
      const parsed = parseVacuumStatus(d);
      return {
        id: d.id,
        name: d.name,
        online: d.online,
        ...parsed,
      };
    });

    res.json(result.length === 1 ? result[0] : result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch vacuum status";
    res.status(502).json({ error: message });
  }
}

export async function vacuumControlHandler(req: Request, res: Response) {
  try {
    const { deviceId, action } = req.body as {
      deviceId: string;
      action: string;
    };

    if (!deviceId || !action) {
      res.status(400).json({ error: "deviceId and action required" });
      return;
    }

    const commands: { code: string; value: unknown }[] = [];

    switch (action) {
      case "power_on":
        commands.push({ code: "power_go", value: true });
        break;
      case "power_off":
        commands.push({ code: "power_go", value: false });
        break;
      case "start":
        commands.push({ code: "power_go", value: true });
        commands.push({ code: "mode", value: "smart" });
        break;
      case "stop":
        commands.push({ code: "mode", value: "standby" });
        break;
      case "pause":
        commands.push({ code: "power_go", value: false });
        break;
      case "dock":
        commands.push({ code: "mode", value: "chargego" });
        break;
      case "locate":
        commands.push({ code: "direction_control", value: "stop" });
        break;
      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }

    await sendDeviceCommand(deviceId, commands);

    const device = await getDeviceStatus(deviceId);
    const parsed = parseVacuumStatus(device);

    res.json({
      id: device.id,
      name: device.name,
      online: device.online,
      ...parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to control vacuum";
    res.status(502).json({ error: message });
  }
}
