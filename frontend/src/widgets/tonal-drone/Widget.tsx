import { useRef, useState, useCallback, useEffect } from "react";
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
      <div className="tonal-drone">
        <div className="tonal-drone__grid">
          {NOTES.map(n => (
            <button
              key={n.name}
              className={`tonal-drone__note ${activeNote === n.name ? "tonal-drone__note--active" : ""}`}
              onClick={() => toggle(n.freq, n.name)}
              type="button"
            >
              <span className="tonal-drone__name">{n.name}</span>
              <span className="tonal-drone__freq">{n.freq.toFixed(1)} Hz</span>
            </button>
          ))}
        </div>
        <div className="tonal-drone__visualizer">
          <div
            className={`tonal-drone__ring ${activeNote ? "tonal-drone__ring--active" : ""}`}
          >
            <div className="tonal-drone__pulse" />
          </div>
        </div>
        <div className="tonal-drone__hint">
          {activeNote ? `Playing ${activeNote} — bends slowly` : "Tap a note to drone"}
        </div>
      </div>
    </WidgetCard>
  );
}
