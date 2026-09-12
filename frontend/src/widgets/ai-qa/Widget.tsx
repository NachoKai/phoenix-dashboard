import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  provider?: string;
}

const AUTO_VALUE = "auto";
const MODEL_SEPARATOR = "::";

const MODEL_GROUPS: {
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

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  gemini: "Google AI Studio",
  llm7: "LLM7.io",
  local: "Local",
  openrouter: "OpenRouter",
};

function modelOptionValue(group: string, model: string): string {
  return `${group}${MODEL_SEPARATOR}${model}`;
}

export function AiQaWidget({ instance }: WidgetProps) {
  const configuredModel = instance.config.model as string | undefined;
  const defaultModel = MODEL_GROUPS.some(g =>
    g.options.some(o => modelOptionValue(g.id, o.id) === configuredModel),
  )
    ? configuredModel!
    : AUTO_VALUE;
  const systemPrompt = (instance.config.systemPrompt as string) ?? "";

  const storageKey = `ai-qa-${instance.id}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      console.error("[widget] Failed to load chat history");
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      console.error("[widget] Failed to save chat history");
      /* storage unavailable */
    }
  }, [messages, storageKey]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const isAuto = selectedModel === AUTO_VALUE;
    let provider: string | undefined;
    let model: string | undefined;
    if (!isAuto) {
      const idx = selectedModel.indexOf(MODEL_SEPARATOR);
      if (idx >= 0) {
        provider = selectedModel.slice(0, idx);
        model = selectedModel.slice(idx + MODEL_SEPARATOR.length);
      }
    }

    try {
      const res = await fetch(
        `${API_BASE}/ask?widgetId=${encodeURIComponent(instance.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            provider,
            model,
            systemPrompt: systemPrompt || undefined,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            ...(isAuto
              ? {
                  autoProviders:
                    (instance.config.autoProviders as string[] | undefined) ?? undefined,
                }
              : {}),
            ...(instance.config.localBaseUrl
              ? { localBaseUrl: instance.config.localBaseUrl as string }
              : {}),
          }),
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

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "",
          model: data.model,
          provider: data.provider,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 50);
      inputRef.current?.focus();
    }
  }, [
    input,
    loading,
    messages,
    selectedModel,
    systemPrompt,
    instance.id,
    scrollToBottom,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <WidgetCard title="AI Q&A" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Toolbar>
          <ModelSelect
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            <option value={AUTO_VALUE}>⚡ Auto (best free)</option>
            {MODEL_GROUPS.map(g => (
              <optgroup key={g.id} label={g.label}>
                {g.options.map(o => (
                  <option
                    key={modelOptionValue(g.id, o.id)}
                    value={modelOptionValue(g.id, o.id)}
                  >
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </ModelSelect>
          {messages.length > 0 && (
            <ClearBtn type="button" onClick={clearChat} title="Clear chat">
              ✕
            </ClearBtn>
          )}
        </Toolbar>

        <Messages>
          {messages.length === 0 && !loading && <Empty>Ask anything…</Empty>}
          {messages.map((msg, i) => (
            <Msg key={i} $role={msg.role}>
              {msg.role === "assistant" && (msg.provider || msg.model) ? (
                <AssistantWrap>
                  <MsgContent $role="assistant">{msg.content}</MsgContent>
                  <ProviderBadge>
                    via {PROVIDER_LABELS[msg.provider ?? ""] ?? msg.provider ?? "AI"}
                    {msg.model ? ` · ${msg.model}` : ""}
                  </ProviderBadge>
                </AssistantWrap>
              ) : (
                <MsgContent $role={msg.role}>{msg.content}</MsgContent>
              )}
            </Msg>
          ))}
          {loading && (
            <Msg $role="assistant">
              <MsgContent $role="assistant" as={TypingWrapper}>
                <TypingDot />
                <TypingDot />
                <TypingDot />
              </MsgContent>
            </Msg>
          )}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div ref={messagesEndRef} />
        </Messages>

        <InputRow>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ask anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <SendBtn
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
          >
            {loading ? "…" : "↑"}
          </SendBtn>
        </InputRow>
      </Wrapper>
    </WidgetCard>
  );
}

const typingAnim = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 6px;
  flex-shrink: 0;
`;

const ModelSelect = styled.select`
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  appearance: auto;
`;

const ClearBtn = styled.button`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.6rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;

  &:hover {
    color: ${({ theme }) => theme.error};
    border-color: ${({ theme }) => theme.error};
  }
`;

const Messages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
  scroll-behavior: smooth;
  background: ${({ theme }) => theme.bgElevated};
  border-radius: 8px;
`;

const Empty = styled.p`
  margin: auto;
  text-align: center;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
  opacity: 0.6;
`;

const Msg = styled.div<{ $role: "user" | "assistant" }>`
  display: flex;
  justify-content: ${({ $role }) => ($role === "user" ? "flex-end" : "flex-start")};
`;

const MsgContent = styled.div<{ $role: "user" | "assistant" }>`
  max-width: 85%;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  background: ${({ $role, theme }) =>
    $role === "user" ? theme.accent : theme.bgElevated};
  color: ${({ $role }) => ($role === "user" ? "#fff" : "inherit")};
  ${({ $role }) =>
    $role === "user"
      ? "border-bottom-right-radius: 3px;"
      : "border-bottom-left-radius: 3px;"}
`;

const TypingWrapper = styled(MsgContent)`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
`;

const AssistantWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  max-width: 100%;
`;

const ProviderBadge = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.7;
  padding: 0 2px;
`;

const TypingDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.textMuted};
  animation: ${typingAnim} 1.2s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.15s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }
`;

const ErrorMsg = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.error};
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 8px;
  padding: 5px 8px;
  margin-top: 4px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px 0 0;
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SendBtn = styled.button`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.accent};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;
