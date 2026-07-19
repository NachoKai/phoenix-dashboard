import { useState, useRef, useCallback, useEffect } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

export function FidgetSpinnerWidget({}: WidgetProps) {
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const [displayRot, setDisplayRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const animRef = useRef(0);
  const flickData = useRef({ t: 0, x: 0 });

  const animate = useCallback(() => {
    velocityRef.current *= 0.985;
    rotationRef.current += velocityRef.current;
    setDisplayRot(rotationRef.current);
    if (Math.abs(velocityRef.current) < 0.3) {
      setSpinning(false);
      velocityRef.current = 0;
      return;
    }
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const startFlick = useCallback((e: React.PointerEvent) => {
    flickData.current = { t: Date.now(), x: e.clientX };
  }, []);

  const moveFlick = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const now = Date.now();
    const dt = now - flickData.current.t;
    if (dt < 5) return;
    const dx = e.clientX - flickData.current.x;
    velocityRef.current = (dx / dt) * 60;
    flickData.current = { t: now, x: e.clientX };
  }, []);

  const endFlick = useCallback(() => {
    if (Math.abs(velocityRef.current) > 3 && !spinning) {
      setSpinning(true);
      animRef.current = requestAnimationFrame(animate);
    }
  }, [spinning, animate]);

  const tapSpin = useCallback(() => {
    if (!spinning) {
      velocityRef.current = 5 + Math.random() * 8;
      setSpinning(true);
      animRef.current = requestAnimationFrame(animate);
    }
  }, [spinning, animate]);

  return (
    <WidgetCard title="Fidget Spinner" status="success" error={null} dragHandle={true}>
      <div
        className="fidget-spinner"
        onPointerDown={startFlick}
        onPointerMove={moveFlick}
        onPointerUp={endFlick}
        onPointerLeave={endFlick}
      >
        <svg
          viewBox="-120 -120 240 240"
          className="fidget-spinner__svg"
          onClick={tapSpin}
        >
          <g transform={`rotate(${displayRot})`}>
            <circle
              r="14"
              fill="var(--bg-elevated)"
              stroke="var(--accent)"
              strokeWidth="2.5"
            />
            <circle r="6" fill="var(--accent)" />
            {[0, 120, 240].map(angle => (
              <g key={angle} transform={`rotate(${angle})`}>
                <rect
                  x="-5"
                  y="8"
                  width="10"
                  height="55"
                  rx="4"
                  fill="var(--accent-dim)"
                />
                <circle cy="68" r="20" fill="var(--accent)" />
                {Array.from({ length: 8 }, (_, i) => (
                  <circle
                    key={i}
                    cy="68"
                    r="3"
                    fill="var(--bg)"
                    opacity="0.25"
                    transform={`rotate(${i * 45})`}
                  />
                ))}
              </g>
            ))}
          </g>
        </svg>
        <div className="fidget-spinner__hint">{spinning ? "" : "Flick or tap"}</div>
      </div>
    </WidgetCard>
  );
}
