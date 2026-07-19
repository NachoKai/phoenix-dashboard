import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
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

  const [isDragging, setIsDragging] = useState(false);

  return (
    <WidgetCard title="Gradient Shift" status="success" error={null} dragHandle={true}>
      <Wrapper
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
        <Info>
          <Label>{palette.label}</Label>
          <Hint>
            {supported ? "Tilt phone to shift" : "Drag to shift"}
          </Hint>
        </Info>
        <Palettes>
          {PALETTES.map(p => (
            <Swatch
              key={p.label}
              $active={palette === p}
              style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
              onClick={() => setPalette(p)}
              aria-label={p.label}
              type="button"
            />
          ))}
        </Palettes>
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.3s ease;
  position: relative;
  touch-action: none;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const Label = styled.p`
  margin: 0;
  font-size: clamp(0.65rem, 3.5cqw, 0.9rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
`;

const Hint = styled.p`
  margin: 0;
  font-size: clamp(0.45rem, 2.5cqw, 0.65rem);
  color: rgba(255, 255, 255, 0.6);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const Palettes = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Swatch = styled.button<{ $active: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid ${({ $active }) => ($active ? "#fff" : "rgba(255,255,255,0.3)")};
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s;
  transform: ${({ $active }) => ($active ? "scale(1.2)" : "scale(1)")};

  &:hover {
    transform: scale(1.2);
  }
`;
