import type { Request, Response } from "express";
import { resolveApiKey } from "../../utils/resolveApiKey.js";
import {
  AUTO_PROVIDERS_DEFAULT,
  callProvider,
  getProvider,
  ProviderCallError,
  type ChatMessage,
  withLocalBase,
} from "./providers.js";

export const AUTO = "auto";
export const MODEL_SEPARATOR = "::";

const REQUEST_TIMEOUT_MS = 20_000;

interface ProviderFailure {
  provider: string;
  reason: string;
}

function isTransientFailure(status: number, detail: string): boolean {
  if (status === 0) return true; // timeout / network
  if (status === 429) return true; // rate limited / quota
  if (status >= 500) return true;
  const body = detail.toLowerCase();
  return (
    status === 400 &&
    (body.includes("no endpoints found") ||
      body.includes("not found") ||
      body.includes("does not exist"))
  );
}

function reasonFor(status: number, detail: string): string {
  const trimmed = detail.trim();
  if (status === 0) return trimmed;
  if (!trimmed) return `HTTP ${status}`;
  if (trimmed.length > 140) return `${trimmed.slice(0, 140)}…`;
  return `${trimmed} (HTTP ${status})`;
}

function friendlyReason(
  providerId: string,
  status: number,
  detail: string,
): string {
  if (providerId === "local" && status === 0 && detail === "network error") {
    return "no local model server reachable — start Ollama/LM Studio or set the Local URL";
  }
  return reasonFor(status, detail);
}

export async function aiQaHandler(req: Request, res: Response) {
  try {
    const {
      message,
      provider,
      model,
      systemPrompt,
      history,
      autoProviders,
      localBaseUrl,
    } = req.body as {
      message?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
      history?: ChatMessage[];
      autoProviders?: string[];
      localBaseUrl?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const widgetId = req.query.widgetId as string | undefined;

    // Build the provider chain. Manual picks go first, then the Auto chain,
    // so a manual choice still fails over through the free providers.
    const autoChain =
      Array.isArray(autoProviders) && autoProviders.length > 0
        ? autoProviders
        : [...AUTO_PROVIDERS_DEFAULT];

    let chain: string[];
    if (provider && provider !== AUTO) {
      if (!getProvider(provider)) {
        res.status(400).json({ error: `unknown provider: ${provider}` });
        return;
      }
      chain = [provider, ...autoChain.filter(p => p !== provider)];
    } else {
      chain = [...autoChain];
    }

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

    const failures: ProviderFailure[] = [];
    const missingKeys: string[] = [];

    for (const providerId of chain) {
      const base = getProvider(providerId);
      if (!base) continue;

      const resolved = providerId === "local" ? withLocalBase(base, localBaseUrl) : base;

      let apiKey: string | null = null;
      if (resolved.requiresKey) {
        apiKey = await resolveApiKey(widgetId, resolved.keyName!, resolved.envKey!);
        if (!apiKey) {
          missingKeys.push(resolved.label);
          continue;
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const { reply, model: usedModel } = await callProvider({
          provider: resolved,
          apiKey,
          model: model?.trim() || resolved.models[0]!.id,
          messages,
          signal: controller.signal,
        });
        if (!reply.trim()) {
          failures.push({ provider: resolved.label, reason: "empty response" });
          continue;
        }
        res.json({ reply, provider: resolved.id, model: usedModel });
        return;
      } catch (err) {
        if (err instanceof ProviderCallError) {
          failures.push({
            provider: resolved.label,
            reason: friendlyReason(resolved.id, err.status, err.detail),
          });
          // Manual picks only fall back on transient failures; a hard error
          // (e.g. bad key) is surfaced instead of masking the cause.
          if (
            provider &&
            provider !== AUTO &&
            !isTransientFailure(err.status, err.detail)
          ) {
            res
              .status(err.status)
              .json({
                error: `${resolved.label} error: ${reasonFor(err.status, err.detail)}`,
              });
            return;
          }
        } else {
          const detail = err instanceof Error ? err.message : "unknown error";
          failures.push({ provider: resolved.label, reason: detail });
          if (provider && provider !== AUTO) {
            res.status(502).json({ error: detail });
            return;
          }
        }
      } finally {
        clearTimeout(timer);
      }
    }

    if (failures.length === 0) {
      const missing =
        missingKeys.length > 0 ? ` — missing keys: ${missingKeys.join(", ")}` : "";
      res.status(503).json({
        error: "No AI provider available",
        message: `Add at least one provider API key to the widget or .env, or start a local model${missing}. Providers checked: ${chain.join(", ") || "none"}.`,
      });
      return;
    }

    res.status(502).json({
      error: "All AI providers failed",
      message:
        failures.map(f => `${f.provider}: ${f.reason}`).join(" · ") +
        (missingKeys.length > 0
          ? ` · No API key set for: ${missingKeys.join(", ")} (add it in widget settings)`
          : ""),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    res.status(502).json({ error: message });
  }
}
