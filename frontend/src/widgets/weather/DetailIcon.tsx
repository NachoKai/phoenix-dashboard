import type { ReactNode } from "react";
import styled from "styled-components";

const OWM = "https://openweathermap.org/img/widget_icons";

const OWM_ICONS: Record<string, string> = {
  humidity: `${OWM}/humidity-low.svg`,
  wind: `${OWM}/wind.svg`,
};

const SVG_ICONS: Record<string, ReactNode> = {
  feels: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 14C9.657 14 11 12.657 11 11V5c0-.552-.448-1-1-1s-1 .448-1 1v5.5H8V5c0-.552-.448-1-1-1s-1 .448-1 1v6c0 1.657 1.343 3 3 3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11h4M8 2v2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  sunrise: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 11h12M8 2v3M4.93 4.93l2.12 2.12M11.07 4.93L8.95 7.05M3 13c0-1.657 2.239-3 5-3s5 1.343 5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  sunset: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 11h12M8 5V2M4.93 7.05l2.12-2.12M11.07 7.05L8.95 4.93M3 13c0-1.657 2.239-3 5-3s5 1.343 5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  aqi: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 10c-1.105 0-2-.895-2-2s.895-2 2-2c.069 0 .137 0 .204.01C4.643 4.28 6.205 3 8 3c2.209 0 4 1.791 4 4 0 .069 0 .137-.01.204.666.367 1.143 1.021 1.143 1.796 0 1.177-.957 2.133-2.143 2.133H4.5c-.828 0-1.5-.672-1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M5 13h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

export function DetailIcon({ name }: { name: string }) {
  const src = OWM_ICONS[name];
  if (src) return <IconImg src={src} alt="" />;
  const svg = SVG_ICONS[name];
  if (svg) return <IconWrap>{svg}</IconWrap>;
  return null;
}

const IconImg = styled.img`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const IconWrap = styled.span`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;
