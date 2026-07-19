import { useState, useEffect } from "react";
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
      <div className="color-calm">
        <div
          className="color-calm__gradient"
          style={{
            background: `linear-gradient(
              ${45 + phase * 360}deg,
              ${getBlendedColor(0)},
              ${getBlendedColor(1)},
              ${getBlendedColor(2)}
            )`,
          }}
        >
          <div className="color-calm__inner">
            <div className="color-calm__name">{palette.name}</div>
          </div>
        </div>
        <div className="color-calm__palettes">
          {PALETTES.map(p => (
            <button
              key={p.name}
              className={`color-calm__swatch ${palette === p ? "color-calm__swatch--active" : ""}`}
              style={{
                background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[p.colors.length - 1]})`,
              }}
              onClick={() => setPalette(p)}
              aria-label={p.name}
              type="button"
            />
          ))}
        </div>
      </div>
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
