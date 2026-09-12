export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const AUTO_VALUE = "auto";
export const MODEL_SEPARATOR = "::";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
}

export const MODEL_GROUPS: {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}[] = [
  {
    id: "groq",
    label: "Groq",
    options: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
      { id: "qwen/qwen3-8b", label: "Qwen3 8B" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    ],
  },
  {
    id: "gemini",
    label: "Google AI Studio (Gemini)",
    options: [
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "llm7",
    label: "LLM7.io (free)",
    options: [
      { id: "codestral-latest", label: "Codestral (free)" },
      { id: "minimax-m2.7", label: "MiniMax M2.7 (free)" },
      { id: "mistral-Nemo-Instruct-2407", label: "Mistral Nemo (free)" },
    ],
  },
  {
    id: "local",
    label: "Local (Ollama / LM Studio)",
    options: [
      { id: "llama3.3", label: "Llama 3.3" },
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "gemma3", label: "Gemma 3" },
      { id: "qwen3", label: "Qwen3" },
      { id: "mistral", label: "Mistral" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    options: [
      { id: "openrouter/free", label: "Auto router (best free)" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)" },
      { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (free)" },
      { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
      { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (free)" },
    ],
  },
];

export const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  gemini: "Google AI Studio",
  llm7: "LLM7.io",
  local: "Local",
  openrouter: "OpenRouter",
};

export function modelOptionValue(group: string, model: string): string {
  return `${group}${MODEL_SEPARATOR}${model}`;
}
