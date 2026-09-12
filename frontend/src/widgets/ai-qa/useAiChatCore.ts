import { useCallback, useEffect, useState } from "react";
import {
  API_BASE,
  AUTO_VALUE,
  MODEL_GROUPS,
  modelOptionValue,
  type ChatMessage,
} from "./models";
import { buildSystemPrompt } from "./prompt";
import { useLatest } from "./useLatest";

type Mode = "chat" | "pet";

interface UseAiChatCoreOptions {
  onAssistantReply?: (reply: string) => void;
}

interface UseAiChatCoreReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  send: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useAiChatCore(
  instanceId: string,
  config: Record<string, unknown>,
  mode: Mode,
  options: UseAiChatCoreOptions = {},
): UseAiChatCoreReturn {
  const { onAssistantReply } = options;
  const onAssistantReplyRef = useLatest(onAssistantReply);

  const storageKey = `ai-qa-${instanceId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      console.error("[widget] Failed to load chat history");
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    const configured = config.model as string | undefined;
    const valid = MODEL_GROUPS.some(g =>
      g.options.some(o => modelOptionValue(g.id, o.id) === configured),
    );
    return valid ? (configured as string) : AUTO_VALUE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      console.error("[widget] Failed to save chat history");
      /* storage unavailable */
    }
  }, [messages, storageKey]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      const isAuto = selectedModel === AUTO_VALUE;
      let provider: string | undefined;
      let model: string | undefined;
      if (!isAuto) {
        const idx = selectedModel.indexOf("::");
        if (idx >= 0) {
          provider = selectedModel.slice(0, idx);
          model = selectedModel.slice(idx + "::".length);
        }
      }

      const body: Record<string, unknown> = {
        message: trimmed,
        provider,
        model,
        systemPrompt:
          buildSystemPrompt(
            (config.systemPrompt as string | undefined) ?? "",
            (config.petSystemPrompt as string | undefined) ?? "",
            mode,
          ) ?? undefined,
        history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (isAuto) {
        body.autoProviders =
          (config.autoProviders as string[] | undefined) ?? undefined;
      }
      if (config.localBaseUrl) {
        body.localBaseUrl = config.localBaseUrl;
      }

      try {
        const res = await fetch(
          `${API_BASE}/ask?widgetId=${encodeURIComponent(instanceId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        const data = (await res.json()) as {
          reply?: string;
          model?: string;
          provider?: string;
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          const detail = data.message ? ` ${data.message}` : "";
          throw new Error(`${data.error ?? `HTTP ${res.status}`}${detail}`);
        }

        const reply = data.reply ?? "";
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            model: data.model,
            provider: data.provider,
          },
        ]);
        onAssistantReplyRef.current?.(reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [loading, selectedModel, messages, mode, config, instanceId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    selectedModel,
    setSelectedModel,
    send,
    clearChat,
  };
}
