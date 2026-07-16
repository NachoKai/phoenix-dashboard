import type { Request, Response } from "express";
import { getCachedValue, setCachedValue } from "../../db/index.js";
import { resolveApiKey } from "../../utils/resolveApiKey.js";

const CACHE_TTL_MS = 10 * 60 * 1000;

interface DailyForecast {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  description: string;
}

interface WeeklyWeatherResponse {
  location: string;
  units: string;
  daily: DailyForecast[];
  cachedAt: string;
}



async function geocodeLocation(
  location: string,
  apiKey: string,
): Promise<{ lat?: number; lon?: number; cityId?: number; name: string }> {
  const trimmed = location.trim();

  if (/^\d+$/.test(trimmed)) {
    return { cityId: Number(trimmed), name: `City ${trimmed}` };
  }

  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(trimmed)) {
    const [lat, lon] = trimmed.split(",").map(Number);
    return { lat, lon, name: trimmed };
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(trimmed)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as {
    lat: number;
    lon: number;
    name: string;
    country: string;
  }[];
  if (!data.length) throw new Error(`Location not found: ${location}`);
  return {
    lat: data[0].lat,
    lon: data[0].lon,
    name: `${data[0].name}, ${data[0].country}`,
  };
}

function getDayName(dt: number, tzOffsetSec: number, lang: string): string {
  const locale =
    lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : lang;
  return new Date((dt + tzOffsetSec) * 1000).toLocaleDateString(locale, {
    weekday: "short",
  });
}

export async function weatherWeeklyHandler(req: Request, res: Response) {
  try {
    const location = (req.query.location as string) || "Buenos Aires";
    const units = (req.query.units as string) || "metric";
    const lang = (req.query.lang as string) || "en";
    const widgetId = req.query.widgetId as string | undefined;

    const apiKey = resolveApiKey(widgetId, "apiKey", "OPENWEATHER_API_KEY");
    if (!apiKey) {
      res.status(503).json({ error: "Weather API key not configured" });
      return;
    }

    const cacheKey = `weather-weekly:${location}:${units}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const geo = await geocodeLocation(location, apiKey);
    const unitParam = units === "imperial" ? "imperial" : "metric";

    const locationParam = geo.cityId
      ? `id=${geo.cityId}`
      : `lat=${geo.lat}&lon=${geo.lon}`;

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${locationParam}&units=${unitParam}&lang=${lang}&appid=${apiKey}`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      throw new Error(`Weather API error: ${forecastRes.status}`);
    }

    const forecastData = (await forecastRes.json()) as {
      list: {
        dt: number;
        dt_txt: string;
        main: { temp_min: number; temp_max: number; temp: number };
        weather: { description: string; icon: string }[];
      }[];
      city: { name: string; timezone: number };
    };

    const tzOffsetSec = forecastData.city.timezone;
    const todayStr = new Date(Date.now() + tzOffsetSec * 1000)
      .toISOString()
      .split("T")[0];

    const byDay = new Map<
      string,
      { temps: number[]; icons: string[]; descriptions: string[]; dt: number }
    >();

    for (const item of forecastData.list) {
      const localDate = new Date((item.dt + tzOffsetSec) * 1000);
      const dateStr = localDate.toISOString().split("T")[0];
      if (!dateStr || dateStr === todayStr) continue;
      const existing = byDay.get(dateStr);
      if (existing) {
        existing.temps.push(item.main.temp);
        existing.icons.push(item.weather[0]?.icon ?? "01d");
        existing.descriptions.push(item.weather[0]?.description ?? "");
      } else {
        byDay.set(dateStr, {
          temps: [item.main.temp],
          icons: [item.weather[0]?.icon ?? "01d"],
          descriptions: [item.weather[0]?.description ?? ""],
          dt: item.dt,
        });
      }
    }

    const daily: DailyForecast[] = [];
    for (const [dateStr, info] of byDay) {
      const iconCounts = new Map<string, number>();
      for (const ic of info.icons) {
        iconCounts.set(ic, (iconCounts.get(ic) ?? 0) + 1);
      }
      const dominantIcon =
        [...iconCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "01d";

      daily.push({
        date: dateStr,
        dayName: getDayName(info.dt, tzOffsetSec, lang),
        tempMin: Math.round(Math.min(...info.temps)),
        tempMax: Math.round(Math.max(...info.temps)),
        icon: dominantIcon,
        description: info.descriptions[0] ?? "",
      });
    }

    daily.sort((a, b) => a.date.localeCompare(b.date));

    const locationName = geo.cityId ? forecastData.city.name || geo.name : geo.name;

    const result: WeeklyWeatherResponse = {
      location: locationName,
      units: unitParam,
      daily,
      cachedAt: new Date().toISOString(),
    };

    setCachedValue(cacheKey, JSON.stringify(result), CACHE_TTL_MS);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Weather fetch failed";
    res.status(502).json({ error: message });
  }
}
