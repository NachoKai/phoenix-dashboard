import { useMemo } from "react";
import styled from "styled-components";
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
    ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100,
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
      <Wrapper>
        <Emoji>{phase.emoji}</Emoji>
        <Info>
          <Name>{phase.name}</Name>
          <BarTrack>
            <BarFill style={{ width: `${phase.illumination}%` }} />
          </BarTrack>
          <Illumination>{phase.illumination}% illuminated</Illumination>
        </Info>
      </Wrapper>
    </WidgetCard>
  );
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Emoji = styled.span`
  font-size: clamp(2.5rem, 20cqw, 6rem);
  line-height: 1;
  flex-shrink: 0;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Name = styled.p`
  margin: 0;
  font-size: clamp(0.75rem, 4.5cqw, 1.3rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const BarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.bgElevated};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #5c6bc0, #ffd54f);
  transition: width 0.3s ease;
`;

const Illumination = styled.p`
  margin: 0;
  font-size: clamp(0.6rem, 3.5cqw, 1rem);
  color: ${({ theme }) => theme.textMuted};
  font-variant-numeric: tabular-nums;
`;
