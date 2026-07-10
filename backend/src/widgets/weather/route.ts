import type { Request, Response } from 'express';
import { decrypt, getEncryptionKey } from '../../config/encryption.js';
import { getCachedValue, getEncryptedKey, setCachedValue } from '../../db/index.js';

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
  cachedAt: string;
}

function resolveApiKey(widgetId?: string): string | null {
  if (widgetId) {
    const stored = getEncryptedKey(widgetId, 'apiKey');
    if (stored) {
      try {
        return decrypt(stored, getEncryptionKey());
      } catch {
        /* fall through */
      }
    }
  }
  return process.env.OPENWEATHER_API_KEY ?? null;
}

async function geocodeLocation(
  location: string,
  apiKey: string,
): Promise<{ lat: number; lon: number; name: string }> {
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location.trim())) {
    const [lat, lon] = location.split(',').map(Number);
    return { lat, lon, name: location };
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as { lat: number; lon: number; name: string; country: string }[];
  if (!data.length) throw new Error(`Location not found: ${location}`);
  return { lat: data[0].lat, lon: data[0].lon, name: `${data[0].name}, ${data[0].country}` };
}

export async function weatherHandler(req: Request, res: Response) {
  try {
    const location = (req.query.location as string) || 'London';
    const units = (req.query.units as string) || 'metric';
    const widgetId = req.query.widgetId as string | undefined;

    const apiKey = resolveApiKey(widgetId);
    if (!apiKey) {
      res.status(503).json({ error: 'Weather API key not configured' });
      return;
    }

    const cacheKey = `weather:${location}:${units}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const geo = await geocodeLocation(location, apiKey);
    const unitParam = units === 'imperial' ? 'imperial' : 'metric';

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&units=${unitParam}&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&units=${unitParam}&appid=${apiKey}&cnt=8`;

    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);

    if (!currentRes.ok) {
      throw new Error(`Weather API error: ${currentRes.status}`);
    }

    const current = (await currentRes.json()) as {
      main: { temp: number; feels_like: number; humidity: number };
      weather: { description: string; icon: string }[];
      wind: { speed: number };
    };

    let forecast: WeatherResponse['forecast'] = [];
    if (forecastRes.ok) {
      const forecastData = (await forecastRes.json()) as {
        list: { dt_txt: string; main: { temp: number }; weather: { description: string; icon: string }[] }[];
      };
      forecast = forecastData.list.slice(0, 6).map((item) => ({
        time: item.dt_txt.split(' ')[1]?.slice(0, 5) ?? item.dt_txt,
        temp: Math.round(item.main.temp),
        description: item.weather[0]?.description ?? '',
        icon: item.weather[0]?.icon ?? '01d',
      }));
    }

    const result: WeatherResponse = {
      location: geo.name,
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0]?.description ?? '',
      icon: current.weather[0]?.icon ?? '01d',
      windSpeed: Math.round(current.wind.speed),
      units: unitParam,
      forecast,
      cachedAt: new Date().toISOString(),
    };

    setCachedValue(cacheKey, JSON.stringify(result), CACHE_TTL_MS);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weather fetch failed';
    res.status(502).json({ error: message });
  }
}
