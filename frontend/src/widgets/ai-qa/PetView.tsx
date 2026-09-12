import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { RobotFace, type ActivityState, type EmotionState } from "./RobotFace";
import { useTTS } from "./useTTS";
import { useVoiceInput } from "./useVoiceInput";
import type { ChatMessage } from "./models";

interface PetViewProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
}

const HELLO = "Say hi — tap the mic to talk to PIXEL";

export function PetView({ messages, loading, error, send }: PetViewProps) {
  const [activity, setActivity] = useState<ActivityState>("idle");
  const [subtitle, setSubtitle] = useState(HELLO);
  const [fallbackText, setFallbackText] = useState("");
  const emotion: EmotionState = "neutral";

  const tts = useTTS({
    onSpeakStart: () => setActivity("talking"),
    onSpeakEnd: () => setActivity("idle"),
  });

  const voice = useVoiceInput({
    onInterim: part => setSubtitle(`… ${part}`),
    onResult: text => {
      setSubtitle(`You: ${text}`);
      setActivity("thinking");
      void send(text);
    },
    onError: msg => {
      setSubtitle(msg);
      setActivity("idle");
    },
  });

  const lastAssistant = useMemo(
    () => messages.filter(m => m.role === "assistant").at(-1),
    [messages],
  );

  useEffect(() => {
    if (activity !== "thinking") return;
    if (!lastAssistant || tts.isSpeaking) return;
    setSubtitle(lastAssistant.content);
    if (tts.isMuted) {
      setActivity("idle");
    } else {
      tts.speak(lastAssistant.content);
    }
  }, [activity, lastAssistant, tts]);

  const handleMic = useCallback(() => {
    if (voice.isRecording) {
      voice.stopRecording();
      setSubtitle(HELLO);
      setActivity("idle");
    } else {
      setSubtitle("Listening…");
      tts.stop();
      setActivity("listening");
      voice.startRecording();
    }
  }, [voice, tts]);

  const handleFallbackSend = useCallback(() => {
    const text = fallbackText.trim();
    if (!text || loading) return;
    setFallbackText("");
    setSubtitle(`You: ${text}`);
    setActivity("thinking");
    void send(text);
  }, [fallbackText, loading, send]);

  const isTalking = activity === "talking";

  return (
    <PetBody>
      <FaceBox>
        <RobotFace activity={activity} emotion={emotion} />
      </FaceBox>
      <Subtitle>{subtitle}</Subtitle>
      {error && <PetError>{error}</PetError>}
      <Controls>
        <MicBtn
          $recording={voice.isRecording}
          disabled={isTalking}
          onClick={handleMic}
          title={voice.isRecording ? "Stop listening" : "Talk to PIXEL"}
        >
          {voice.isRecording ? "■" : "🎙"}
        </MicBtn>
        <MuteBtn
          $muted={tts.isMuted}
          onClick={tts.toggleMute}
          title={tts.isMuted ? "Unmute" : "Mute"}
        >
          {tts.isMuted ? "🔇" : "🔊"}
        </MuteBtn>
      </Controls>
      {!voice.isSupported && (
        <FallbackRow>
          <FallbackInput
            type="text"
            placeholder="Type to PIXEL…"
            value={fallbackText}
            onChange={e => setFallbackText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleFallbackSend();
            }}
            disabled={loading}
          />
          <FallbackSendBtn
            type="button"
            onClick={handleFallbackSend}
            disabled={loading || !fallbackText.trim()}
          >
            {loading ? "…" : "↑"}
          </FallbackSendBtn>
        </FallbackRow>
      )}
    </PetBody>
  );
}

const PetBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
`;

const FaceBox = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Subtitle = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textMuted};
  text-align: center;
  min-height: 1.1em;
  max-width: 100%;
  overflow-wrap: break-word;
  padding: 2px 8px;
  flex-shrink: 0;
`;

const PetError = styled.p`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.error};
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 8px;
  padding: 5px 8px;
  margin: 0;
  max-width: 100%;
  overflow-wrap: break-word;
  flex-shrink: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const MicBtn = styled.button<{ $recording: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid
    ${({ theme, $recording }) => ($recording ? theme.error : theme.border)};
  background: ${({ theme, $recording }) =>
    $recording ? "rgba(255,107,107,0.15)" : theme.bgElevated};
  color: ${({ theme, $recording }) => ($recording ? theme.error : theme.text)};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const MuteBtn = styled.button<{ $muted: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bgElevated};
  color: ${({ theme, $muted }) => ($muted ? theme.textMuted : theme.text)};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
`;

const FallbackRow = styled.div`
  display: flex;
  gap: 6px;
  width: 100%;
  padding: 0 8px 6px;
  flex-shrink: 0;
`;

const FallbackInput = styled.input`
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
`;

const FallbackSendBtn = styled.button`
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

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;
