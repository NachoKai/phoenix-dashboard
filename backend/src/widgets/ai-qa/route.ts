import type { Request, Response } from "express";
import { resolveApiKey } from "../../utils/resolveApiKey.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";



interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function aiQaHandler(req: Request, res: Response) {
  try {
    const { message, model, systemPrompt, history } = req.body as {
      message?: string;
      model?: string;
      systemPrompt?: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const widgetId = req.query.widgetId as string | undefined;
    const apiKey = resolveApiKey(widgetId, "openrouterApiKey", "OPENROUTER_API_KEY");
    if (!apiKey) {
      res.status(503).json({
        error: "OpenRouter API key not configured",
        message:
          "Add your OpenRouter API key in widget settings or set OPENROUTER_API_KEY in .env",
      });
      return;
    }

    const selectedModel = model || "meta-llama/llama-3.1-8b-instruct:free";

    const messages: ChatMessage[] = [];
    if (systemPrompt?.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    if (Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message.trim() });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://moto-dashboard.local",
        "X-Title": "Moto Dashboard AI Widget",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        detail = parsed.error?.message ?? body;
      } catch {
        /* use raw body */
      }

      // Auto-fallback: if model is unavailable, retry with openrouter/free
      if (detail.includes("No endpoints found") && selectedModel !== "openrouter/free") {
        const retryRes = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://moto-dashboard.local",
            "X-Title": "Moto Dashboard AI Widget",
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages,
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as {
            choices?: { message?: { content?: string } }[];
            model?: string;
          };
          const retryReply = retryData.choices?.[0]?.message?.content ?? "";
          if (retryReply) {
            res.json({ reply: retryReply, model: retryData.model ?? "openrouter/free" });
            return;
          }
        }
      }

      res.status(response.status).json({ error: `OpenRouter error: ${detail}` });
      return;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };

    const reply = data.choices?.[0]?.message?.content ?? "";
    if (!reply) {
      res.status(502).json({ error: "Empty response from model" });
      return;
    }

    res.json({ reply, model: data.model ?? selectedModel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    res.status(502).json({ error: message });
  }
}
