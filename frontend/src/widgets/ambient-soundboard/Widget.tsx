import { useRef, useState, useCallback, useEffect } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

type SoundId = "rain" | "ocean" | "forest" | "white" | "pink" | "brown";

interface SoundDef {
  id: SoundId;
  label: string;
  icon: string;
}

const SOUNDS: SoundDef[] = [
  { id: "rain", label: "Rain", icon: "🌧" },
  { id: "ocean", label: "Ocean", icon: "🌊" },
  { id: "forest", label: "Forest", icon: "🌲" },
  { id: "white", label: "White", icon: "❄" },
  { id: "pink", label: "Pink", icon: "🌸" },
  { id: "brown", label: "Brown", icon: "🟤" },
];

function createNoiseBuffer(
  ctx: AudioContext,
  type: "white" | "pink" | "brown",
  duration: number,
) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = (b0 + white * 0.02) * 0.5;
        b0 = data[i];
      }
    }
  }
  return buffer;
}

export function AmbientSoundboardWidget({}: WidgetProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const sources = useRef<
    Map<SoundId, { node: AudioNode; gain: GainNode; buffer?: AudioBufferSourceNode }>
  >(new Map());
  const [active, setActive] = useState<Set<SoundId>>(new Set());

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const stop = useCallback((id: SoundId) => {
    const entry = sources.current.get(id);
    if (!entry) return;
    try {
      (entry.node as AudioBufferSourceNode).stop();
    } catch {}
    sources.current.delete(id);
    setActive(prev => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  const toggle = useCallback(
    (id: SoundId) => {
      const ctx = getCtx();
      if (sources.current.has(id)) {
        stop(id);
        return;
      }

      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      gain.connect(ctx.destination);

      let node: AudioNode;

      if (id === "rain" || id === "forest") {
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] =
            (Math.random() * 2 - 1) * Math.pow(Math.random(), id === "rain" ? 3 : 2);
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        if (id === "rain") {
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 1200;
          filter.Q.value = 0.5;
          src.connect(filter);
          filter.connect(gain);
        } else {
          src.connect(gain);
        }
        node = src;
        src.start();
      } else if (id === "ocean") {
        const bufferSize = ctx.sampleRate * 8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let phase = 0;
        for (let i = 0; i < bufferSize; i++) {
          phase += (0.5 + Math.sin(i * 0.0003) * 0.3) / ctx.sampleRate;
          const noise = Math.random() * 2 - 1;
          const wave = Math.sin(phase * Math.PI * 2) * 0.3;
          data[i] = noise * 0.3 + wave * Math.min(1, i / ctx.sampleRate);
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        src.connect(filter);
        filter.connect(gain);
        node = src;
        src.start();
      } else {
        const duration = 8;
        const buffer = createNoiseBuffer(ctx, id, duration);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = id === "brown" ? "lowpass" : "bandpass";
        filter.frequency.value = id === "brown" ? 400 : id === "pink" ? 2000 : 4000;
        src.connect(filter);
        filter.connect(gain);
        node = src;
        src.start();
      }

      sources.current.set(id, {
        node,
        gain,
        buffer: node instanceof AudioBufferSourceNode ? node : undefined,
      });
      setActive(prev => {
        const n = new Set(prev);
        n.add(id);
        return n;
      });
    },
    [getCtx, stop],
  );

  useEffect(() => {
    return () => {
      for (const id of sources.current.keys()) stop(id);
      ctxRef.current?.close();
    };
  }, [stop]);

  return (
    <WidgetCard title="Soundboard" status="success" error={null} dragHandle={true}>
      <div className="ambient-soundboard">
        <div className="ambient-soundboard__grid">
          {SOUNDS.map(s => (
            <button
              key={s.id}
              className={`ambient-soundboard__btn ${active.has(s.id) ? "ambient-soundboard__btn--active" : ""}`}
              onClick={() => toggle(s.id)}
              type="button"
            >
              <span className="ambient-soundboard__icon">{s.icon}</span>
              <span className="ambient-soundboard__label">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="ambient-soundboard__hint">
          {active.size === 0 ? "Tap a sound to play" : `${active.size} active`}
        </div>
      </div>
    </WidgetCard>
  );
}
