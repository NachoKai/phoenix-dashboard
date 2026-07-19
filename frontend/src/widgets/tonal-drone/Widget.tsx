import { useRef, useState, useCallback, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const NOTES = [
  { name: "C3", freq: 130.81 },
  { name: "E3", freq: 164.81 },
  { name: "G3", freq: 196.0 },
  { name: "C4", freq: 261.63 },
  { name: "E4", freq: 329.63 },
  { name: "G4", freq: 392.0 },
];

export function TonalDroneWidget({}: WidgetProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscillators = useRef<
    Map<string, { osc: OscillatorNode; gain: GainNode; lfo?: OscillatorNode }>
  >(new Map());
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const evolveRef = useRef(0);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (freq: number, name: string) => {
      const ctx = getCtx();
      if (oscillators.current.has(name)) return;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.05 + Math.random() * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.start();
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);

      oscillators.current.set(name, { osc, gain, lfo });
      setActiveNote(name);
      evolveRef.current = 1;

      const evolve = setInterval(() => {
        const entry = oscillators.current.get(name);
        if (!entry) {
          clearInterval(evolve);
          return;
        }
        evolveRef.current = (evolveRef.current % 6) + 1;
        entry.osc.frequency.linearRampToValueAtTime(
          freq * (1 + Math.sin(evolveRef.current) * 0.02),
          ctx.currentTime + 3,
        );
      }, 4000);

      return () => clearInterval(evolve);
    },
    [getCtx],
  );

  const stop = useCallback(
    (name: string) => {
      const entry = oscillators.current.get(name);
      if (!entry) return;
      const ctx = getCtx();
      entry.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        try {
          entry.osc.stop();
        } catch {}
        try {
          entry.lfo?.stop();
        } catch {}
      }, 1200);
      oscillators.current.delete(name);
      setActiveNote(null);
    },
    [getCtx],
  );

  const toggle = useCallback(
    (freq: number, name: string) => {
      if (oscillators.current.has(name)) {
        stop(name);
        return;
      }
      play(freq, name);
    },
    [play, stop],
  );

  useEffect(() => {
    return () => {
      for (const [name] of oscillators.current) stop(name);
      ctxRef.current?.close();
    };
  }, [stop]);

  return (
    <WidgetCard title="Tonal Drone" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Grid>
          {NOTES.map(n => (
            <NoteBtn
              key={n.name}
              $active={activeNote === n.name}
              onClick={() => toggle(n.freq, n.name)}
              type="button"
            >
              <Name>{n.name}</Name>
              <Freq>{n.freq.toFixed(1)} Hz</Freq>
            </NoteBtn>
          ))}
        </Grid>
        <Visualizer>
          <Ring $active={!!activeNote}>
            <Pulse />
          </Ring>
        </Visualizer>
        <Hint>
          {activeNote ? `Playing ${activeNote} — bends slowly` : "Tap a note to drone"}
        </Hint>
      </Wrapper>
    </WidgetCard>
  );
}

const dronePulse = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(78, 205, 196, 0.2); }
  50% { box-shadow: 0 0 16px rgba(78, 205, 196, 0.5); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 240px;
`;

const NoteBtn = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 4px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.success : theme.border)};
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: ${({ $active }) =>
    $active ? "0 0 8px rgba(78, 205, 196, 0.3)" : "none"};

  &:hover {
    border-color: ${({ theme }) => theme.accent};
  }
`;

const Name = styled.span`
  font-size: clamp(0.65rem, 3.5cqw, 0.9rem);
  font-weight: 600;
`;

const Freq = styled.span`
  font-size: clamp(0.45rem, 2.5cqw, 0.65rem);
  color: ${({ theme }) => theme.textMuted};
`;

const Visualizer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Ring = styled.div<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid
    ${({ $active, theme }) => ($active ? theme.success : theme.border)};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.5s;
  animation: ${({ $active }) => ($active ? dronePulse : "none")} 3s ease-in-out infinite;
`;

const Pulse = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.success};
  opacity: 0.6;
`;

const Hint = styled.div`
  font-size: clamp(0.45rem, 2.5cqw, 0.65rem);
  color: ${({ theme }) => theme.textMuted};
  opacity: 0.5;
`;
