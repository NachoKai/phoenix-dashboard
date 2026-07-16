import type { Request, Response } from "express";
import { getCachedValue, setCachedValue } from "../../db/index.js";
import { resolveApiKey } from "../../utils/resolveApiKey.js";

const CACHE_TTL_MS = 10 * 60 * 1000;

interface WeatherResponse {
  location: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  units: string;
  forecast: { time: string; temp: number; description: string; icon: string }[];
  sunrise: number;
  sunset: number;
  aqi: number;
  aqiLabel: string;
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

export async function weatherHandler(req: Request, res: Response) {
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

    const cacheKey = `weather:${location}:${units}`;
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

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?${locationParam}&units=${unitParam}&lang=${lang}&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${locationParam}&units=${unitParam}&lang=${lang}&appid=${apiKey}&cnt=8`;
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?${locationParam}&appid=${apiKey}`;

    const [currentRes, forecastRes, aqiRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl),
      fetch(aqiUrl),
    ]);

    if (!currentRes.ok) {
      throw new Error(`Weather API error: ${currentRes.status}`);
    }

    const current = (await currentRes.json()) as {
      main: { temp: number; feels_like: number; humidity: number };
      weather: { description: string; icon: string }[];
      wind: { speed: number };
      sys: { sunrise: number; sunset: number };
    };

    let forecast: WeatherResponse["forecast"] = [];
    if (forecastRes.ok) {
      const forecastData = (await forecastRes.json()) as {
        list: {
          dt: number;
          dt_txt: string;
          main: { temp: number };
          weather: { description: string; icon: string }[];
        }[];
      };
      const now = Math.floor(Date.now() / 1000);
      forecast = forecastData.list
        .filter(item => item.dt > now)
        .slice(0, 6)
        .map(item => ({
          time: item.dt_txt.split(" ")[1]?.slice(0, 5) ?? item.dt_txt,
          temp: Math.round(item.main.temp),
          description: item.weather[0]?.description ?? "",
          icon: item.weather[0]?.icon ?? "01d",
        }));
    }

    const AQI_LABELS: Record<number, string> = {
      1: "Good",
      2: "Fair",
      3: "Moderate",
      4: "Poor",
      5: "Very Poor",
    };

    let aqi = 0;
    let aqiLabel = "-";
    if (aqiRes.ok) {
      const aqiData = (await aqiRes.json()) as {
        list: { main: { aqi: number } }[];
      };
      aqi = aqiData.list[0]?.main.aqi ?? 0;
      aqiLabel = AQI_LABELS[aqi] ?? "-";
    }

    const result: WeatherResponse = {
      location: geo.cityId
        ? (current as unknown as { name: string }).name || geo.name
        : geo.name,
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0]?.description ?? "",
      icon: current.weather[0]?.icon ?? "01d",
      windSpeed: Math.round(current.wind.speed),
      units: unitParam,
      forecast,
      sunrise: current.sys.sunrise,
      sunset: current.sys.sunset,
      aqi,
      aqiLabel,
      cachedAt: new Date().toISOString(),
    };

    setCachedValue(cacheKey, JSON.stringify(result), CACHE_TTL_MS);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Weather fetch failed";
    res.status(502).json({ error: message });
  }
}
