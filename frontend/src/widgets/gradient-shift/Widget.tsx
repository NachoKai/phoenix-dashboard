import { useEffect, useState, useRef } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const PALETTES = [
  { a: "#667eea", b: "#764ba2", label: "Purple Haze" },
  { a: "#f093fb", b: "#f5576c", label: "Sunset" },
  { a: "#4facfe", b: "#00f2fe", label: "Ocean" },
  { a: "#43e97b", b: "#38f9d7", label: "Mint" },
  { a: "#fa709a", b: "#fee140", label: "Warm Glow" },
  { a: "#a18cd1", b: "#fbc2eb", label: "Lavender" },
  { a: "#fbc2eb", b: "#a6c1ee", label: "Pastel" },
  { a: "#ffecd2", b: "#fcb69f", label: "Peach" },
];

export function GradientShiftWidget({}: WidgetProps) {
  const [supported, setSupported] = useState(true);
  const [palette, setPalette] = useState(PALETTES[0]);
  const tiltRef = useRef({ x: 0, y: 0 });
  const angleRef = useRef(45);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }

    const handler = (e: DeviceOrientationEvent) => {
      tiltRef.current = {
        x: (e.gamma ?? 0) / 45,
        y: ((e.beta ?? 90) - 90) / 45,
      };
      angleRef.current = 45 + tiltRef.current.x * 45 + tiltRef.current.y * 45;
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
  }, []);

  // Fallback: allow mouse/touch to control gradient
  const [isDragging, setIsDragging] = useState(false);

  return (
    <WidgetCard title="Gradient Shift" status="success" error={null} dragHandle={true}>
      <div
        className="gradient-shift"
        style={{
          background: `linear-gradient(${angleRef.current}deg, ${palette.a}, ${palette.b})`,
        }}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
        onPointerMove={e => {
          if (isDragging || !supported) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            angleRef.current = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
            e.currentTarget.style.background = `linear-gradient(${angleRef.current}deg, ${palette.a}, ${palette.b})`;
          }
        }}
      >
        <div className="gradient-shift__info">
          <p className="gradient-shift__label">{palette.label}</p>
          <p className="gradient-shift__hint">
            {supported ? "Tilt phone to shift" : "Drag to shift"}
          </p>
        </div>
        <div className="gradient-shift__palettes">
          {PALETTES.map(p => (
            <button
              key={p.label}
              className={`gradient-shift__swatch ${palette === p ? "gradient-shift__swatch--active" : ""}`}
              style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
              onClick={() => setPalette(p)}
              aria-label={p.label}
              type="button"
            />
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
