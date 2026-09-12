export interface FreeModel {
  id: string;
  label: string;
}

export interface AiProvider {
  id: string;
  label: string;
  /** Base URL, chain of responsibility style: the chat completions endpoint is `${apiBase}/chat/completions`. */
  apiBase: string;
  requiresKey: boolean;
  keyName?: string;
  envKey?: string;
  headers?: Record<string, string>;
  models: FreeModel[];
}

const OPENROUTER_MODELS: FreeModel[] = [
  { id: "openrouter/free", label: "Auto router (best free)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)" },
  { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (free)" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (free)" },
];

const GROQ_MODELS: FreeModel[] = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  { id: "qwen/qwen3-8b", label: "Qwen3 8B" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
];

const GEMINI_MODELS: FreeModel[] = [
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const LLM7_MODELS: FreeModel[] = [
  { id: "codestral-latest", label: "Codestral (free)" },
  { id: "minimax-m2.7", label: "MiniMax M2.7 (free)" },
  { id: "mistral-Nemo-Instruct-2407", label: "Mistral Nemo (free)" },
];

export const LOCAL_MODELS: FreeModel[] = [
  { id: "llama3.3", label: "Llama 3.3" },
  { id: "llama3.1", label: "Llama 3.1" },
  { id: "gemma3", label: "Gemma 3" },
  { id: "qwen3", label: "Qwen3" },
  { id: "mistral", label: "Mistral" },
];

export const DEFAULT_LOCAL_BASE = "http://localhost:11434/v1";

export const AI_PROVIDERS: Record<string, AiProvider> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    apiBase: "https://openrouter.ai/api/v1",
    requiresKey: true,
    keyName: "openrouterApiKey",
    envKey: "OPENROUTER_API_KEY",
    headers: {
      "HTTP-Referer": "https://moto-dashboard.local",
      "X-Title": "Moto Dashboard AI Widget",
    },
    models: OPENROUTER_MODELS,
  },
  groq: {
    id: "groq",
    label: "Groq",
    apiBase: "https://api.groq.com/openai/v1",
    requiresKey: true,
    keyName: "groqApiKey",
    envKey: "GROQ_API_KEY",
    models: GROQ_MODELS,
  },
  gemini: {
    id: "gemini",
    label: "Google AI Studio (Gemini)",
    apiBase: "https://generativelanguage.googleapis.com/v1beta/openai",
    requiresKey: true,
    keyName: "geminiApiKey",
    envKey: "GEMINI_API_KEY",
    models: GEMINI_MODELS,
  },
  llm7: {
    id: "llm7",
    label: "LLM7.io",
    apiBase: "https://api.llm7.io/v1",
    requiresKey: false,
    models: LLM7_MODELS,
  },
  local: {
    id: "local",
    label: "Local (Ollama/LM Studio)",
    apiBase: DEFAULT_LOCAL_BASE,
    requiresKey: false,
    models: LOCAL_MODELS,
  },
};

export const AUTO_PROVIDERS_DEFAULT = ["groq", "gemini", "llm7", "local"];

export const PROVIDER_LIST: AiProvider[] = Object.values(AI_PROVIDERS);

export function getProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS[id];
}

export function withLocalBase(
  provider: AiProvider,
  baseUrl: string | undefined,
): AiProvider {
  return baseUrl?.trim()
    ? { ...provider, apiBase: baseUrl.trim().replace(/\/+$/, "") }
    : provider;
}

export function chatCompletionsUrl(provider: AiProvider): string {
  return `${provider.apiBase.replace(/\/+$/, "")}/chat/completions`;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderCallParams {
  provider: AiProvider;
  apiKey: string | null;
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
}

export class ProviderCallError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ProviderCallError";
    this.status = status;
    this.detail = detail;
  }
}

export async function callProvider({
  provider,
  apiKey,
  model,
  messages,
  signal,
}: ProviderCallParams): Promise<{ reply: string; model: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(provider.headers ?? {}),
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(chatCompletionsUrl(provider), {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProviderCallError(0, "request timed out");
    }
    if (err instanceof TypeError) {
      throw new ProviderCallError(0, "network error");
    }
    throw err;
  }

  let detail = "";
  if (!response.ok) {
    const body = await response.text();
    detail = body;
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string };
        message?: string;
      };
      detail = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      /* keep raw body */
    }
    throw new ProviderCallError(response.status, detail);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const reply = data.choices?.[0]?.message?.content ?? "";

  return { reply, model: data.model ?? model };
}
