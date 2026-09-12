import { useEffect, useState } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { ChatView } from "./ChatView";
import { AUTO_VALUE, MODEL_GROUPS, modelOptionValue } from "./models";
import { PetView } from "./PetView";
import { useAiChatCore } from "./useAiChatCore";

type Mode = "chat" | "pet";

function readMode(key: string): Mode {
  try {
    return localStorage.getItem(key) === "pet" ? "pet" : "chat";
  } catch {
    return "chat";
  }
}

export function AiQaWidget({ instance }: WidgetProps) {
  const modeKey = `ai-qa-${instance.id}-mode`;
  const [mode, setMode] = useState<Mode>(() => readMode(modeKey));

  useEffect(() => {
    try {
      localStorage.setItem(modeKey, mode);
    } catch {
      /* storage unavailable */
    }
  }, [mode, modeKey]);

  const core = useAiChatCore(instance.id, instance.config, mode);

  return (
    <WidgetCard title="AI Q&A" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Toolbar>
          <ModelSelect
            value={core.selectedModel}
            onChange={e => core.setSelectedModel(e.target.value)}
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
          {core.messages.length > 0 && (
            <ClearBtn type="button" onClick={core.clearChat} title="Clear chat">
              ✕
            </ClearBtn>
          )}
          <ModeToggle
            $pet={mode === "pet"}
            type="button"
            onClick={() => setMode(mode === "pet" ? "chat" : "pet")}
            title={mode === "pet" ? "Switch to chat" : "Switch to pet mode"}
          >
            {mode === "pet" ? "💬" : "🐾"}
          </ModeToggle>
        </Toolbar>

        {mode === "pet" ? (
          <PetView
            messages={core.messages}
            loading={core.loading}
            error={core.error}
            send={core.send}
          />
        ) : (
          <ChatView
            messages={core.messages}
            loading={core.loading}
            error={core.error}
            send={core.send}
          />
        )}
      </Wrapper>
    </WidgetCard>
  );
}

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

const ModeToggle = styled.button<{ $pet: boolean }>`
  flex-shrink: 0;
  width: 26px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $pet }) =>
    $pet ? "rgba(138, 43, 226, 0.25)" : theme.bgElevated};
  border: 1px solid
    ${({ theme, $pet }) => ($pet ? theme.accent : theme.border)};
  border-radius: 6px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.accent};
  }
`;
