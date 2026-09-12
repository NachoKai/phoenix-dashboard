import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { PROVIDER_LABELS, type ChatMessage } from "./models";

interface ChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

export function ChatView({ messages, loading, error, send }: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await send(text);
  }, [input, loading, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      <Messages>
        {messages.length === 0 && !loading && <Empty>Ask anything…</Empty>}
        {messages.map((msg, i) => (
          <Msg key={i} $role={msg.role}>
            {msg.role === "assistant" && (msg.provider || msg.model) ? (
              <AssistantWrap>
                <MsgContent $role="assistant">{msg.content}</MsgContent>
                <ProviderBadge>
                  via{" "}
                  {PROVIDER_LABELS[msg.provider ?? ""] ?? msg.provider ?? "AI"}
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
          onClick={() => void handleSend()}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "↑"}
        </SendBtn>
      </InputRow>
    </>
  );
}

const typingAnim = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
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
