import { lazy, type ComponentType } from "react";
import type { WidgetProps } from "../types";

export interface FrontendWidgetEntry {
  type: string;
  component: ComponentType<WidgetProps>;
}

export const widgetRegistry: FrontendWidgetEntry[] = [
  {
    type: "clock",
    component: lazy(() =>
      import("./clock/Widget").then(m => ({ default: m.ClockWidget })),
    ),
  },
  {
    type: "weather",
    component: lazy(() =>
      import("./weather/Widget").then(m => ({ default: m.WeatherWidget })),
    ),
  },
  {
    type: "weather-forecast",
    component: lazy(() =>
      import("./weather/ForecastWidget").then(m => ({
        default: m.WeatherForecastWidget,
      })),
    ),
  },
  {
    type: "weather-weekly",
    component: lazy(() =>
      import("./weather/WeekTemperatureWidget").then(m => ({
        default: m.WeatherWeeklyWidget,
      })),
    ),
  },
  {
    type: "moon-phase",
    component: lazy(() =>
      import("./moon-phase/Widget").then(m => ({ default: m.MoonPhaseWidget })),
    ),
  },
  {
    type: "gifs",
    component: lazy(() => import("./gifs/Widget").then(m => ({ default: m.GifsWidget }))),
  },
  {
    type: "ai-qa",
    component: lazy(() =>
      import("./ai-qa/Widget").then(m => ({ default: m.AiQaWidget })),
    ),
  },
  {
    type: "lights",
    component: lazy(() =>
      import("./lights/Widget").then(m => ({ default: m.LightsWidget })),
    ),
  },
  {
    type: "vacuum",
    component: lazy(() =>
      import("./vacuum/Widget").then(m => ({ default: m.VacuumWidget })),
    ),
  },
];

const widgetMap = new Map(widgetRegistry.map(e => [e.type, e.component]));

export function getWidgetComponent(type: string): ComponentType<WidgetProps> | null {
  return widgetMap.get(type) ?? null;
}
