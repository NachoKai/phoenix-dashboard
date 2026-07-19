import { createGlobalStyle, DefaultTheme } from "styled-components";
import { createContext } from "react";

export interface ThemeModeContextValue {
  themeMode: "dark" | "light";
  setThemeMode: (mode: "dark" | "light") => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: "dark",
  setThemeMode: () => {},
});

const safeTop = "env(safe-area-inset-top, 0px)";
const safeBottom = "env(safe-area-inset-bottom, 0px)";
const safeLeft = "env(safe-area-inset-left, 0px)";
const safeRight = "env(safe-area-inset-right, 0px)";

export const darkTheme: DefaultTheme = {
  bg: "#0a0a0f",
  bgCard: "#14141f",
  bgElevated: "#1c1c2e",
  text: "#e8e8f0",
  textMuted: "#a3a3bf",
  accent: "#4260c4",
  accentDim: "#3d5299",
  error: "#ff6b6b",
  warning: "#ffb347",
  success: "#4ecdc4",
  border: "#2a2a3e",
  radius: "14px",
  safeTop,
  safeBottom,
  safeLeft,
  safeRight,
};

export const lightTheme: DefaultTheme = {
  ...darkTheme,
  bg: "#f0f0f5",
  bgCard: "#ffffff",
  bgElevated: "#e8e8f0",
  text: "#1a1a2e",
  textMuted: "#666680",
  border: "#d0d0e0",
};

declare module "styled-components" {
  export interface DefaultTheme {
    bg: string;
    bgCard: string;
    bgElevated: string;
    text: string;
    textMuted: string;
    accent: string;
    accentDim: string;
    error: string;
    warning: string;
    success: string;
    border: string;
    radius: string;
    safeTop: string;
    safeBottom: string;
    safeLeft: string;
    safeRight: string;
  }
}

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    border-radius: 4px;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  a {
    color: ${({ theme }) => theme.accent};
  }
`;
