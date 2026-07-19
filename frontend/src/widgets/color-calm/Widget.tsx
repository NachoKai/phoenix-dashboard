import { useState, useEffect } from "react";
import styled from "styled-components";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const PALETTES = [
  { name: "Ocean Dream", colors: ["#a8d8ea", "#aa96da", "#fcbad3", "#ffffd2"] },
  { name: "Golden Hour", colors: ["#ffecd2", "#fcb69f", "#fccb90", "#d4a5a5"] },
  { name: "Mint Garden", colors: ["#c1f0c1", "#a8e6cf", "#dcedc1", "#f0f5e5"] },
  { name: "Lavender Sky", colors: ["#e8dff5", "#fce4ec", "#e3f2fd", "#f3e5f5"] },
  { name: "Desert Dusk", colors: ["#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff"] },
  { name: "Rose Petal", colors: ["#ffe0ec", "#ffc8dd", "#bde0fe", "#cdb4db"] },
];

export function ColorCalmWidget({}: WidgetProps) {
  const [palette, setPalette] = useState(PALETTES[0]);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase(p => (p + 0.003) % 1);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const getBlendedColor = (i: number) => {
    const c = palette.colors;
    const pos = (phase + i / c.length) % 1;
    const idx = Math.floor(pos * (c.length - 1));
    const t = (pos * (c.length - 1)) % 1;
    const a = c[idx];
    const b = c[Math.min(idx + 1, c.length - 1)];
    return lerpColor(a, b, t);
  };

  return (
    <WidgetCard title="Color Calm" status="success" error={null} dragHandle={true}>
      <Wrapper>
        <Gradient
          style={{
            background: `linear-gradient(
              ${45 + phase * 360}deg,
              ${getBlendedColor(0)},
              ${getBlendedColor(1)},
              ${getBlendedColor(2)}
            )`,
          }}
        >
          <Inner>
            <Name>{palette.name}</Name>
          </Inner>
        </Gradient>
        <Palettes>
          {PALETTES.map(p => (
            <Swatch
              key={p.name}
              $active={palette === p}
              style={{
                background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[p.colors.length - 1]})`,
              }}
              onClick={() => setPalette(p)}
              aria-label={p.name}
              type="button"
            />
          ))}
        </Palettes>
      </Wrapper>
    </WidgetCard>
  );
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff,
    ag = (ah >> 8) & 0xff,
    ab = ah & 0xff;
  const br = (bh >> 16) & 0xff,
    bg = (bh >> 8) & 0xff,
    bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
`;

const Gradient = styled.div`
  flex: 1;
  width: 100%;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
`;

const Inner = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  padding: 4px 16px;
  border-radius: 20px;
`;

const Name = styled.div`
  font-size: clamp(0.6rem, 3.5cqw, 0.85rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
`;

const Palettes = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  justify-content: center;
  flex-shrink: 0;
`;

const Swatch = styled.button<{ $active: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.border};
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s;
  border-color: ${({ $active, theme }) =>
    $active ? theme.text : theme.border};
  transform: ${({ $active }) => ($active ? "scale(1.2)" : "scale(1)")};

  &:hover {
    transform: scale(1.2);
  }
`;
