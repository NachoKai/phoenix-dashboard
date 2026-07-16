import type { Request, Response } from "express";
import { getCachedValue, setCachedValue } from "../../db/index.js";
import { resolveApiKey } from "../../utils/resolveApiKey.js";

const GIPHY_CACHE_TTL_MS = 30 * 60 * 1000;



export async function gifsHandler(req: Request, res: Response) {
  try {
    const source = (req.query.source as string) || "static";
    const widgetId = req.query.widgetId as string | undefined;
    const tag = (req.query.tag as string) || "nature";
    const urlsParam = req.query.urls as string | undefined;

    if (source === "static") {
      let urls: string[] = [];
      if (urlsParam) {
        try {
          urls = JSON.parse(urlsParam) as string[];
        } catch {
          urls = urlsParam
            .split(",")
            .map(u => u.trim())
            .filter(Boolean);
        }
      }
      res.json({
        source: "static",
        urls,
        cachedAt: new Date().toISOString(),
      });
      return;
    }

    if (source === "giphy") {
      const apiKey = resolveApiKey(widgetId, "apiKey", "GIPHY_API_KEY");
      if (!apiKey) {
        res.status(503).json({ error: "Giphy API key not configured" });
        return;
      }

      const cacheKey = `giphy:${tag}`;
      const cached = getCachedValue(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(tag)}&limit=20&rating=g`;
      const giphyRes = await fetch(url);
      if (!giphyRes.ok) {
        throw new Error(`Giphy API error: ${giphyRes.status}`);
      }

      const data = (await giphyRes.json()) as {
        data: { images: { downsized: { url: string } } }[];
      };
      const urls = data.data.map(g => g.images.downsized.url).filter(Boolean);

      const result = {
        source: "giphy",
        urls,
        tag,
        cachedAt: new Date().toISOString(),
      };

      setCachedValue(cacheKey, JSON.stringify(result), GIPHY_CACHE_TTL_MS);
      res.json(result);
      return;
    }

    res.status(400).json({ error: `Unknown GIF source: ${source}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GIF fetch failed";
    res.status(502).json({ error: message });
  }
}
