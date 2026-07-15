import { useCallback, useRef, useState } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

const MODELS = [
  { value: "openrouter/free", label: "⚡ Auto (best free model)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
  { value: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)" },
  { value: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (free)" },
  { value: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
  { value: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (free)" },
  { value: "google/gemini-flash-1.5", label: "Gemini 1.5 Flash" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
];

export function AiQaWidget({ instance }: WidgetProps) {
  const defaultModel = (instance.config.model as string) ?? MODELS[0]!.value;
  const systemPrompt = (instance.config.systemPrompt as string) ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    try {
      const res = await fetch(
        `${API_BASE}/ask?widgetId=${encodeURIComponent(instance.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            model: selectedModel,
            systemPrompt: systemPrompt || undefined,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          }),
        },
      );

      const data = (await res.json()) as {
        reply?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply ?? "", model: data.model },
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
    <WidgetCard title="" status="success" error={null}>
      <div className="ai-qa-widget">
        <div className="ai-qa-widget__toolbar">
          <select
            className="ai-qa-widget__model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              type="button"
              className="ai-qa-widget__clear-btn"
              onClick={clearChat}
              title="Clear chat"
            >
              ✕
            </button>
          )}
        </div>

        <div className="ai-qa-widget__messages">
          {messages.length === 0 && !loading && (
            <p className="ai-qa-widget__empty">Ask anything…</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`ai-qa-widget__msg ai-qa-widget__msg--${msg.role}`}>
              <div className="ai-qa-widget__msg-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-qa-widget__msg ai-qa-widget__msg--assistant">
              <div className="ai-qa-widget__msg-content ai-qa-widget__typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          {error && <div className="ai-qa-widget__error">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-qa-widget__input-row">
          <input
            ref={inputRef}
            type="text"
            className="ai-qa-widget__input"
            placeholder="Ask anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            type="button"
            className="ai-qa-widget__send-btn"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
          >
            {loading ? "…" : "↑"}
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}
