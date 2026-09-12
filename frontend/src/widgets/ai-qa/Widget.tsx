import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";
import { ChatView } from "./ChatView";
import { AUTO_VALUE, MODEL_GROUPS, modelOptionValue } from "./models";
import { useAiChatCore } from "./useAiChatCore";

export function AiQaWidget({ instance }: WidgetProps) {
  const core = useAiChatCore(instance.id, instance.config, "chat");

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
        </Toolbar>
        <ChatView
          messages={core.messages}
          loading={core.loading}
          error={core.error}
          send={core.send}
        />
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
