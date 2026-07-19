import { useState, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

let popCtx: AudioContext | null = null;

function playPop() {
  if (!popCtx) popCtx = new AudioContext();
  if (popCtx.state === "suspended") popCtx.resume();

  const osc = popCtx.createOscillator();
  const gain = popCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, popCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, popCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, popCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, popCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(popCtx.destination);
  osc.start();
  osc.stop(popCtx.currentTime + 0.12);
}

const ROWS = 5;
const COLS = 8;

export function BubbleWrapWidget({}: WidgetProps) {
  const [popped, setPopped] = useState<Set<number>>(new Set());
  const total = ROWS * COLS;

  const pop = useCallback((index: number) => {
    playPop();
    setPopped(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPopped(new Set());
  }, []);

  return (
    <WidgetCard title="Bubble Wrap" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Grid>
          {Array.from({ length: total }, (_, i) => (
            <Bubble
              key={i}
              $popped={popped.has(i)}
              onClick={() => pop(i)}
              disabled={popped.has(i)}
              aria-label={popped.has(i) ? "Popped" : "Pop"}
            />
          ))}
        </Grid>
        <Footer>
          <Count>
            {popped.size}/{total} popped
          </Count>
          {popped.size > 0 && (
            <Reset onClick={reset} type="button">
              Refill
            </Reset>
          )}
        </Footer>
      </Wrapper>
    </WidgetCard>
  );
}

const bubblePopAnim = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.25); opacity: 0.8; }
  100% { transform: scale(0.85); opacity: 0.4; }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  flex: 1;
  height: 100%;
  align-items: center;
  padding: 0 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  width: 100%;
  flex: 1;
  align-content: center;
`;

const Bubble = styled.button<{ $popped: boolean }>`
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1.5px solid
    ${({ $popped, theme }) =>
      $popped ? theme.border : `color-mix(in srgb, ${theme.accent} 60%, transparent)`};
  background: ${({ $popped, theme }) =>
    $popped
      ? theme.bgElevated
      : `radial-gradient(circle at 35% 30%, ${theme.accent}, ${theme.accentDim} 80%, color-mix(in srgb, ${theme.accentDim} 70%, #000))`};
  cursor: ${({ $popped }) => ($popped ? "default" : "pointer")};
  padding: 0;
  min-width: 0;
  min-height: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: transform 0.1s ease, opacity 0.15s ease, background 0.15s ease;
  box-shadow: ${({ $popped }) =>
    $popped
      ? "none"
      : "inset 0 1px 2px rgba(255, 255, 255, 0.15), 0 1px 2px rgba(0, 0, 0, 0.3)"};
  transform: ${({ $popped }) => ($popped ? "scale(0.85)" : "scale(1)")};
  opacity: ${({ $popped }) => ($popped ? "0.4" : "1")};
  pointer-events: ${({ $popped }) => ($popped ? "none" : "auto")};

  @media (hover: hover) {
    &:hover:not(:disabled) {
      transform: scale(1.12);
      filter: brightness(1.2);
    }
  }

  &:active:not(:disabled) {
    animation: ${bubblePopAnim} 0.15s ease-out;
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 22px;
`;

const Count = styled.span`
  font-size: clamp(0.55rem, 3cqw, 0.75rem);
  color: ${({ theme }) => theme.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Reset = styled.button`
  padding: 2px 10px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: clamp(0.55rem, 3cqw, 0.75rem);
  color: ${({ theme }) => theme.text};
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.accentDim};
    border-color: ${({ theme }) => theme.accent};
    color: #fff;
  }
`;
