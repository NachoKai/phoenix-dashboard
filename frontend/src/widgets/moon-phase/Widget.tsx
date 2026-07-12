import { useMemo } from "react";
import { WidgetCard } from "../../components/WidgetCard";
import type { WidgetProps } from "../../types";

const SYNODIC_MONTH = 29.53058770576;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

interface PhaseInfo {
  name: string;
  emoji: string;
  illumination: number;
  age: number;
}

function getMoonPhase(date: Date): PhaseInfo {
  const diff = date.getTime() - KNOWN_NEW_MOON;
  const days = diff / 86400000;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const illumination = Math.round(
    (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2 * 100,
  );

  if (age < 1.85) return { name: "New Moon", emoji: "🌑", illumination, age };
  if (age < 7.38) return { name: "Waxing Crescent", emoji: "🌒", illumination, age };
  if (age < 9.23) return { name: "First Quarter", emoji: "🌓", illumination, age };
  if (age < 14.77) return { name: "Waxing Gibbous", emoji: "🌔", illumination, age };
  if (age < 16.62) return { name: "Full Moon", emoji: "🌕", illumination, age };
  if (age < 22.15) return { name: "Waning Gibbous", emoji: "🌖", illumination, age };
  if (age < 24.0) return { name: "Last Quarter", emoji: "🌗", illumination, age };
  if (age < 27.68) return { name: "Waning Crescent", emoji: "🌘", illumination, age };
  return { name: "New Moon", emoji: "🌑", illumination, age };
}

export function MoonPhaseWidget({}: WidgetProps) {
  const phase = useMemo(() => getMoonPhase(new Date()), []);

  return (
    <WidgetCard title="" status="success" error={null}>
      <div className="moon-widget">
        <span className="moon-widget__emoji">{phase.emoji}</span>
        <div className="moon-widget__info">
          <p className="moon-widget__name">{phase.name}</p>
          <div className="moon-widget__bar-track">
            <div
              className="moon-widget__bar-fill"
              style={{ width: `${phase.illumination}%` }}
            />
          </div>
          <p className="moon-widget__illumination">{phase.illumination}% illuminated</p>
        </div>
      </div>
    </WidgetCard>
  );
}
