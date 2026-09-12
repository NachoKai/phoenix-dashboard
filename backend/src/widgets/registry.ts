import type { WidgetDefinition } from "../types.js";
import { DEFAULT_PET_PROMPT, DEFAULT_SYSTEM_PROMPT } from "../constants.js";
import { DEFAULT_LOCAL_BASE, PROVIDER_LIST } from "./ai-qa/providers.js";

const MODEL_SEPARATOR = "::";

const aiQaModelOptions = [
  { value: "auto", label: "⚡ Auto (best free)" },
  ...PROVIDER_LIST.flatMap(provider =>
    provider.models.map(model => ({
      value: `${provider.id}${MODEL_SEPARATOR}${model.id}`,
      label: `${provider.label} · ${model.label}`,
    })),
  ),
];
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
      stringList: "urls",
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
      label: "Giphy tag",
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
  description:
    "Multi-model chat across free AI providers (Groq, Gemini, LLM7, local, OpenRouter)",
  hasBackendRoute: true,
  defaultConfig: {
    model: "auto",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    autoProviders: ["groq", "gemini", "llm7", "local"],
    localBaseUrl: DEFAULT_LOCAL_BASE,
    petSystemPrompt: DEFAULT_PET_PROMPT,
  },
  configSchema: [
    {
      key: "model",
      label: "Default model",
      type: "select",
      default: "auto",
      options: aiQaModelOptions,
    },
    {
      key: "systemPrompt",
      label: "System prompt",
      type: "string",
      default: DEFAULT_SYSTEM_PROMPT,
      description: "Instructions for the AI's behavior",
    },
    {
      key: "petSystemPrompt",
      label: "Pet mode prompt",
      type: "string",
      default: DEFAULT_PET_PROMPT,
      description:
        "Persona used in Pet mode. Empty falls back to the default pet persona.",
    },
    {
      key: "autoProviders",
      label: "Auto provider priority",
      type: "string-list",
      stringList: "text",
      default: ["groq", "gemini", "llm7", "local"],
      description:
        "Providers tried in Auto mode, in order. Unset keys are skipped. Available: groq, gemini, llm7, local, openrouter",
    },
    {
      key: "openrouterApiKey",
      label: "OpenRouter API Key",
      type: "secret",
      description:
        "Get a free key at openrouter.ai — falls back to server .env OPENROUTER_API_KEY",
    },
    {
      key: "groqApiKey",
      label: "Groq API Key",
      type: "secret",
      description:
        "Get a free key at console.groq.com — falls back to server .env GROQ_API_KEY",
    },
    {
      key: "geminiApiKey",
      label: "Google AI Studio API Key",
      type: "secret",
      description:
        "Get a free key at aistudio.google.com — falls back to server .env GEMINI_API_KEY",
    },
    {
      key: "localBaseUrl",
      label: "Local model base URL",
      type: "string",
      default: DEFAULT_LOCAL_BASE,
      description:
        "OpenAI-compatible endpoint for Ollama (http://localhost:11434/v1) or LM Studio (http://localhost:1234/v1)",
    },
  ],
};

export const moonPhaseWidget: WidgetDefinition = {
  type: "moon-phase",
  name: "Moon Phase",
  description: "Current lunar phase with illumination",
  hasBackendRoute: false,
  defaultConfig: {
    timezone: "local",
  },
  configSchema: [
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      default: "local",
      description: 'IANA timezone (e.g. America/New_York) or "local"',
    },
  ],
};

export const lightsWidget: WidgetDefinition = {
  type: "lights",
  name: "Light Controls",
  description: "Control smart lights (on/off, brightness, color)",
  hasBackendRoute: true,
  defaultConfig: {
    refreshInterval: 30,
  },
  configSchema: [
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 30,
    },
    {
      key: "tuyaAccessId",
      label: "Tuya Access ID",
      type: "secret",
      description: "From iot.tuya.com; falls back to server .env TUYA_ACCESS_ID",
    },
    {
      key: "tuyaAccessSecret",
      label: "Tuya Access Secret",
      type: "secret",
      description: "From iot.tuya.com; falls back to server .env TUYA_ACCESS_SECRET",
    },
  ],
};

export const vacuumWidget: WidgetDefinition = {
  type: "vacuum",
  name: "Robot Vacuum",
  description: "Robot vacuum status and control (battery, start, dock)",
  hasBackendRoute: true,
  defaultConfig: {
    refreshInterval: 15,
  },
  configSchema: [
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 15,
    },
    {
      key: "tuyaAccessId",
      label: "Tuya Access ID",
      type: "secret",
      description: "From iot.tuya.com; falls back to server .env TUYA_ACCESS_ID",
    },
    {
      key: "tuyaAccessSecret",
      label: "Tuya Access Secret",
      type: "secret",
      description: "From iot.tuya.com; falls back to server .env TUYA_ACCESS_SECRET",
    },
  ],
};

export const bubbleWrapWidget: WidgetDefinition = {
  type: "bubble-wrap",
  name: "Bubble Wrap",
  description: "Pop virtual bubble wrap for stress relief",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const touchRippleWidget: WidgetDefinition = {
  type: "touch-ripple",
  name: "Touch Ripple",
  description: "Rain window with touch ripples",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const bubblePopWidget: WidgetDefinition = {
  type: "bubble-pop",
  name: "Bubble Pop",
  description: "Floating bubbles to tap and pop",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const tonalDroneWidget: WidgetDefinition = {
  type: "tonal-drone",
  name: "Tonal Drone",
  description: "Sustained notes that slowly bend",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const gradientShiftWidget: WidgetDefinition = {
  type: "gradient-shift",
  name: "Gradient Shift",
  description: "Phone tilt changes gradient colors",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const zenBellWidget: WidgetDefinition = {
  type: "zen-bell",
  name: "Zen Bell",
  description: "Shake or tap to ring a singing bowl",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const lavaLampWidget: WidgetDefinition = {
  type: "lava-lamp",
  name: "Lava Lamp",
  description: "Smooth blobby animation",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const colorCalmWidget: WidgetDefinition = {
  type: "color-calm",
  name: "Color Calm",
  description: "Slowly shifting pastel gradients",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const aquariumWidget: WidgetDefinition = {
  type: "aquarium",
  name: "Aquarium",
  description: "Swimming fish with seaweed",
  hasBackendRoute: false,
  defaultConfig: {},
  configSchema: [],
};

export const healthCheckWidget: WidgetDefinition = {
  type: "health-check",
  name: "Server Health",
  description: "Backend health, uptime, and memory stats",
  hasBackendRoute: true,
  defaultConfig: {
    refreshInterval: 30,
  },
  configSchema: [
    {
      key: "refreshInterval",
      label: "Refresh interval (seconds)",
      type: "number",
      default: 30,
    },
  ],
};

export const widgetRegistry: WidgetDefinition[] = [
  clockWidget,
  weatherWidget,
  weatherForecastWidget,
  weatherWeeklyWidget,
  moonPhaseWidget,
  gifsWidget,
  aiQaWidget,
  lightsWidget,
  vacuumWidget,
  bubbleWrapWidget,
  touchRippleWidget,
  bubblePopWidget,
  tonalDroneWidget,
  gradientShiftWidget,
  zenBellWidget,
  lavaLampWidget,
  colorCalmWidget,
  aquariumWidget,
  healthCheckWidget,
];

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return widgetRegistry.find(w => w.type === type);
}
