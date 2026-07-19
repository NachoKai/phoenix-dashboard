import { useState, useCallback } from "react";
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
      <div className="bubble-wrap">
        <div className="bubble-wrap__grid">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              className={`bubble-wrap__bubble ${popped.has(i) ? "bubble-wrap__bubble--popped" : ""}`}
              onClick={() => pop(i)}
              disabled={popped.has(i)}
              aria-label={popped.has(i) ? "Popped" : "Pop"}
            />
          ))}
        </div>
        <div className="bubble-wrap__footer">
          <span className="bubble-wrap__count">
            {popped.size}/{total} popped
          </span>
          {popped.size > 0 && (
            <button className="bubble-wrap__reset" onClick={reset} type="button">
              Refill
            </button>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
