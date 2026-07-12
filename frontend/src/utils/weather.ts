export function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const AQI_COLORS: Record<number, string> = {
  1: "#4caf50",
  2: "#8bc34a",
  3: "#ff9800",
  4: "#f44336",
  5: "#9c27b0",
};
