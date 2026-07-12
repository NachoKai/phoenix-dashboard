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

const LABELS: Record<string, Record<string, string>> = {
  en: {
    feels: "Feels",
    humidity: "Humidity",
    wind: "Wind",
    sunrise: "Sunrise",
    sunset: "Sunset",
    aqi: "AQI",
  },
  es: {
    feels: "Sensación",
    humidity: "Humedad",
    wind: "Viento",
    sunrise: "Amanecer",
    sunset: "Atardecer",
    aqi: "ICA",
  },
  fr: {
    feels: "Ressenti",
    humidity: "Humidité",
    wind: "Vent",
    sunrise: "Lever",
    sunset: "Coucher",
    aqi: "ICA",
  },
  de: {
    feels: "Gefühlt",
    humidity: "Feuchtigkeit",
    wind: "Wind",
    sunrise: "Sonnenaufgang",
    sunset: "Sonnenuntergang",
    aqi: "Luftqualität",
  },
  pt: {
    feels: "Sensação",
    humidity: "Umidade",
    wind: "Vento",
    sunrise: "Nascer",
    sunset: "Pôr do sol",
    aqi: "QUALIDADE",
  },
  it: {
    feels: "Percepita",
    humidity: "Umidità",
    wind: "Vento",
    sunrise: "Alba",
    sunset: "Tramonto",
    aqi: "QUALITÀ",
  },
};

export function getLabel(lang: string, key: string): string {
  return LABELS[lang]?.[key] ?? LABELS.en[key] ?? key;
}
