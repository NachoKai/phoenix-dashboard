import type { Request, Response } from "express";
import { getAllDevices, sendDeviceCommand, getDeviceStatus } from "../tuya/client.js";

export interface LightDevice {
  id: string;
  name: string;
  online: boolean;
  isOn: boolean;
  brightness: number;
  colorTemp: number;
  color: string;
  colorMode: string;
}

function parseLightStatus(device: { status: { code: string; value: unknown }[] }): {
  isOn: boolean;
  brightness: number;
  colorTemp: number;
  color: string;
  colorMode: string;
} {
  let isOn = false;
  let brightness = 100;
  let colorTemp = 0;
  let color = "#ffffff";
  let colorMode = "unknown";

  for (const dp of device.status) {
    switch (dp.code) {
      case "switch_led":
        isOn = dp.value === true;
        break;
      case "brightness":
      case "bright_value_v2":
        brightness = typeof dp.value === "number" ? dp.value : 100;
        break;
      case "color_temp":
      case "temp_value_v2":
        colorTemp = typeof dp.value === "number" ? dp.value : 0;
        break;
      case "color":
        if (typeof dp.value === "string") {
          color = rgbHexFromTuya(dp.value);
          colorMode = "color";
        }
        break;
      case "colour_data_v2":
        if (typeof dp.value === "string") {
          try {
            const hsv = JSON.parse(dp.value);
            color = hsvToHex(hsv.h ?? 0, hsv.s ?? 1000, hsv.v ?? 1000);
            colorMode = "color";
          } catch {
            color = rgbHexFromTuya(dp.value);
            colorMode = "color";
          }
        }
        break;
      case "work_mode":
        if (typeof dp.value === "string") {
          colorMode = dp.value;
        }
        break;
    }
  }

  return { isOn, brightness, colorTemp, color, colorMode };
}

function rgbHexFromTuya(tuyaColor: string): string {
  try {
    const h = parseInt(tuyaColor.slice(0, 4), 16);
    const sRaw = parseInt(tuyaColor.slice(4, 8), 16);
    const vRaw = parseInt(tuyaColor.slice(8, 12), 16);

    const sVal = sRaw / 1000;
    const vVal = vRaw / 1000;

    const c = vVal * sVal;
    const x = c * (1 - Math.abs((((h / 360) * 6) % 2) - 1));
    const m = vVal - c;

    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (n: number) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return "#ffffff";
  }
}

function hsvToHex(h: number, sRaw: number, vRaw: number): string {
  const s = sRaw / 1000;
  const v = vRaw / 1000;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToTuyaColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((d / max) * 1000);
  const v = Math.round(max * 1000);

  return `${h.toString(16).padStart(4, "0")}${s.toString(16).padStart(4, "0")}${v.toString(16).padStart(4, "0")}`;
}

function hexToTuyaHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((d / max) * 1000);
  const v = Math.round(max * 1000);

  return { h, s, v };
}

export async function lightsListHandler(req: Request, res: Response) {
  try {
    const deviceId = req.query.deviceId as string | undefined;

    if (deviceId) {
      const device = await getDeviceStatus(deviceId);
      const parsed = parseLightStatus(device);
      res.json([
        {
          id: device.id,
          name: device.name,
          online: device.online,
          isOn: parsed.isOn,
          brightness: parsed.brightness,
          colorTemp: parsed.colorTemp,
          color: parsed.color,
          colorMode: parsed.colorMode,
        },
      ]);
      return;
    }

    const devices = await getAllDevices();
    const lights = devices.filter(
      d =>
        d.category === "dj" ||
        d.category === "dd" ||
        d.category === "light" ||
        d.category === "infrared_ac" ||
        d.name.toLowerCase().includes("light") ||
        d.name.toLowerCase().includes("lamp") ||
        d.name.toLowerCase().includes("bulb") ||
        d.product_name.toLowerCase().includes("light") ||
        d.status.some(
          s =>
            s.code === "switch_led" ||
            s.code === "brightness" ||
            s.code === "bright_value_v2" ||
            s.code === "color" ||
            s.code === "colour_data_v2" ||
            s.code === "color_temp" ||
            s.code === "temp_value_v2",
        ),
    );

    const result: LightDevice[] = lights.map(d => {
      const parsed = parseLightStatus(d);
      return {
        id: d.id,
        name: d.name,
        online: d.online,
        isOn: parsed.isOn,
        brightness: parsed.brightness,
        colorTemp: parsed.colorTemp,
        color: parsed.color,
        colorMode: parsed.colorMode,
      };
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch lights";
    res.status(502).json({ error: message });
  }
}

export async function lightsControlHandler(req: Request, res: Response) {
  try {
    const { deviceId, action, value } = req.body as {
      deviceId: string;
      action: string;
      value?: unknown;
    };

    if (!deviceId || !action) {
      res.status(400).json({ error: "deviceId and action required" });
      return;
    }

    const commands: { code: string; value: unknown }[] = [];

    switch (action) {
      case "toggle":
        commands.push({ code: "switch_led", value: value === true });
        break;
      case "brightness":
        commands.push({ code: "bright_value_v2", value: Number(value) });
        break;
      case "color":
        commands.push({
          code: "colour_data_v2",
          value: JSON.stringify(hexToTuyaHsv(String(value))),
        });
        break;
      case "color_temp":
        commands.push({ code: "temp_value_v2", value: Number(value) });
        break;
      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }

    await sendDeviceCommand(deviceId, commands);

    const device = await getDeviceStatus(deviceId);
    const parsed = parseLightStatus(device);

    res.json({
      id: device.id,
      name: device.name,
      online: device.online,
      ...parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to control light";
    res.status(502).json({ error: message });
  }
}
