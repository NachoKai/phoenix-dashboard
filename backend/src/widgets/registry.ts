import type { WidgetDefinition } from "../types.js";
export const clockWidget: WidgetDefinition = {
  type: "clock",
  name: "Clock",
  description: "Current time and date",
  hasBackendRoute: false,
  defaultConfig: {
    format: "24h",
    timezone: "local",
    showSeconds: false,
  },
  configSchema: [
    {
      key: "format",
      label: "Time format",
      type: "select",
      default: "24h",
      options: [
        { value: "12h", label: "12-hour" },
        { value: "24h", label: "24-hour" },
      ],
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      default: "local",
      description: 'IANA timezone (e.g. America/New_York) or "local"',
    },
    {
      key: "showSeconds",
      label: "Show seconds",
      type: "boolean",
      default: false,
    },
  ],
};

export const weatherWidget: WidgetDefinition = {
  type: "weather",
  name: "Weather",
  description: "Current conditions and short forecast",
  hasBackendRoute: true,
  defaultConfig: {
    location: "Buenos Aires",
    units: "metric",
    lang: "en",
    refreshInterval: 600,
  },
  configSchema: [
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "Buenos Aires",
      description: "City name or lat,lon",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      default: "metric",
      options: [
        { value: "metric", label: "Metric (°C)" },
        { value: "imperial", label: "Imperial (°F)" },
      ],
    },
    {
      key: "lang",
      label: "Language",
      type: "select",
      default: "en",
      options: [
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
        { value: "fr", label: "Français" },
        { value: "de", label: "Deutsch" },
        { value: "pt", label: "Português" },
        { value: "it", label: "Italiano" },
      ],
    },
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 600,
    },
    {
      key: "apiKey",
      label: "OpenWeatherMap API Key",
      type: "secret",
      description: "Stored encrypted; falls back to server .env key",
    },
  ],
};

export const weatherForecastWidget: WidgetDefinition = {
  type: "weather-forecast",
  name: "Weather Forecast",
  description: "Upcoming hours forecast",
  hasBackendRoute: true,
  defaultConfig: {
    location: "Buenos Aires",
    units: "metric",
    lang: "en",
    refreshInterval: 600,
  },
  configSchema: [
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "Buenos Aires",
      description: "City name or lat,lon",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      default: "metric",
      options: [
        { value: "metric", label: "Metric (°C)" },
        { value: "imperial", label: "Imperial (°F)" },
      ],
    },
    {
      key: "lang",
      label: "Language",
      type: "select",
      default: "en",
      options: [
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
        { value: "fr", label: "Français" },
        { value: "de", label: "Deutsch" },
        { value: "pt", label: "Português" },
        { value: "it", label: "Italiano" },
      ],
    },
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 600,
    },
    {
      key: "apiKey",
      label: "OpenWeatherMap API Key",
      type: "secret",
      description: "Stored encrypted; falls back to server .env key",
    },
  ],
};

export const weatherWeeklyWidget: WidgetDefinition = {
  type: "weather-weekly",
  name: "Weekly Temperature",
  description: "Daily min/max temperatures for the week",
  hasBackendRoute: true,
  defaultConfig: {
    location: "Buenos Aires",
    units: "metric",
    lang: "en",
    refreshInterval: 600,
  },
  configSchema: [
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "Buenos Aires",
      description: "City name or lat,lon",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      default: "metric",
      options: [
        { value: "metric", label: "Metric (°C)" },
        { value: "imperial", label: "Imperial (°F)" },
      ],
    },
    {
      key: "lang",
      label: "Language",
      type: "select",
      default: "en",
      options: [
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
        { value: "fr", label: "Français" },
        { value: "de", label: "Deutsch" },
        { value: "pt", label: "Português" },
        { value: "it", label: "Italiano" },
      ],
    },
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 600,
    },
    {
      key: "apiKey",
      label: "OpenWeatherMap API Key",
      type: "secret",
      description: "Stored encrypted; falls back to server .env key",
    },
  ],
};

export const gifsWidget: WidgetDefinition = {
  type: "gifs",
  name: "Animated GIFs",
  description: "Rotating GIF display",
  hasBackendRoute: true,
  defaultConfig: {
    source: "static",
    urls: [],
    rotationInterval: 30,
    tag: "nature",
  },
  configSchema: [
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "static",
      options: [
        { value: "static", label: "Static URL list" },
        { value: "giphy", label: "Giphy API" },
      ],
    },
    {
      key: "urls",
      label: "GIF URLs",
      type: "string-list",
      default: [],
      description: "One URL per line (static mode)",
    },
    {
      key: "rotationInterval",
      label: "Rotation interval (seconds)",
      type: "number",
      default: 30,
    },
    {
      key: "tag",
      label: "Giphy tag/category",
      type: "string",
      default: "nature",
      description: "Used when source is Giphy API",
    },
    {
      key: "apiKey",
      label: "Giphy API Key",
      type: "secret",
      description: "Stored encrypted; falls back to server .env key",
    },
  ],
};

export const aiQaWidget: WidgetDefinition = {
  type: "ai-qa",
  name: "AI Q&A",
  description: "Ask questions via LLM (coming soon)",
  hasBackendRoute: true,
  defaultConfig: {
    placeholder: "Ask anything...",
    refreshInterval: 0,
  },
  configSchema: [
    {
      key: "placeholder",
      label: "Input placeholder",
      type: "string",
      default: "Ask anything...",
    },
    {
      key: "apiKey",
      label: "LLM API Key",
      type: "secret",
      description: "Stored encrypted for future use",
    },
  ],
};

export const widgetRegistry: WidgetDefinition[] = [
  clockWidget,
  weatherWidget,
  weatherForecastWidget,
  weatherWeeklyWidget,
  gifsWidget,
  aiQaWidget,
];

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return widgetRegistry.find(w => w.type === type);
}
