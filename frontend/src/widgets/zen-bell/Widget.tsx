import { useRef, useState, useEffect, useCallback } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

export function ZenBellWidget({}: WidgetProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [ringing, setRinging] = useState(false);
  const [supported, setSupported] = useState(true);
  const lastShake = useRef(0);
  const shakeCount = useRef(0);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const ring = useCallback(() => {
    const ctx = getCtx();
    setRinging(true);
    setTimeout(() => setRinging(false), 2000);

    const baseFreq = 220 + Math.random() * 80;
    const harmonics = [1, 2.01, 3.02, 4.03, 5.05];
    for (let i = 0; i < harmonics.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = baseFreq * harmonics[i];
      const gain = ctx.createGain();
      const vol = i === 0 ? 0.2 : 0.05 / (i + 1);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3 + i * 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 4);
    }

    const noise = ctx.createOscillator();
    noise.type = "sawtooth";
    noise.frequency.value = baseFreq * 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.03, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 2);
  }, [getCtx]);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }

    let lastBeta = 0;
    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      const delta = Math.abs(beta - lastBeta);
      lastBeta = beta;

      if (delta > 15) {
        const now = Date.now();
        if (now - lastShake.current > 500) {
          shakeCount.current++;
          lastShake.current = now;
          if (shakeCount.current >= 2) {
            shakeCount.current = 0;
            ring();
          }
        }
      }
    };

    const requestPermission = async () => {
      const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof DeviceOrientationEventAny.requestPermission === "function") {
        try {
          const perm = await DeviceOrientationEventAny.requestPermission();
          if (perm !== "granted") {
            setSupported(false);
            return;
          }
        } catch {
          setSupported(false);
          return;
        }
      }
      window.addEventListener("deviceorientation", handler);
    };
    requestPermission();

    return () => window.removeEventListener("deviceorientation", handler);
  }, [ring]);

  return (
    <WidgetCard title="Zen Bell" status="success" error={null} dragHandle={true}>
      <div
        className="zen-bell"
        onClick={() => {
          if (!ringing) ring();
        }}
      >
        <div className={`zen-bell__bell ${ringing ? "zen-bell__bell--ringing" : ""}`}>
          <svg viewBox="-60 -60 120 120" className="zen-bell__svg">
            <g>
              <path
                d="M-8,-40 Q0,-45 8,-40 L12,-10 Q0,-5 -12,-10 Z"
                fill={ringing ? "#ffd700" : "var(--accent-dim)"}
                stroke={ringing ? "#ffb300" : "var(--accent)"}
                strokeWidth="1.5"
              />
              <line
                x1="0"
                y1="-40"
                x2="0"
                y2="-50"
                stroke={ringing ? "#ffd700" : "var(--accent)"}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cy="-50" r="3" fill={ringing ? "#ffd700" : "var(--accent)"} />
              <line
                x1="-8"
                y1="-10"
                x2="8"
                y2="-10"
                stroke={ringing ? "#ffd700" : "var(--accent-dim)"}
                strokeWidth="1.5"
              />
              <line
                x1="-12"
                y1="-10"
                x2="-20"
                y2="15"
                stroke={ringing ? "#ffd700" : "var(--accent-dim)"}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="-10"
                x2="20"
                y2="15"
                stroke={ringing ? "#ffd700" : "var(--accent-dim)"}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </svg>
          {ringing && (
            <div className="zen-bell__waves">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="zen-bell__wave"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="zen-bell__hint">
          {supported ? "Shake phone or tap to ring" : "Tap to ring"}
        </div>
      </div>
    </WidgetCard>
  );
}
