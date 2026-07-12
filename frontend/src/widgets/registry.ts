import type { ComponentType } from "react";
import type { WidgetProps } from "../types";
import { AiQaWidget } from "./ai-qa/Widget";
import { ClockWidget } from "./clock/Widget";
import { GifsWidget } from "./gifs/Widget";
import { LightsWidget } from "./lights/Widget";
import { MoonPhaseWidget } from "./moon-phase/Widget";
import { VacuumWidget } from "./vacuum/Widget";
import { WeatherForecastWidget } from "./weather/ForecastWidget";
import { WeatherWeeklyWidget } from "./weather/WeekTemperatureWidget";
import { WeatherWidget } from "./weather/Widget";

export interface FrontendWidgetEntry {
  type: string;
  component: ComponentType<WidgetProps>;
}

export const widgetRegistry: FrontendWidgetEntry[] = [
  { type: "clock", component: ClockWidget },
  { type: "weather", component: WeatherWidget },
  { type: "weather-forecast", component: WeatherForecastWidget },
  { type: "weather-weekly", component: WeatherWeeklyWidget },
  { type: "moon-phase", component: MoonPhaseWidget },
  { type: "gifs", component: GifsWidget },
  { type: "ai-qa", component: AiQaWidget },
  { type: "lights", component: LightsWidget },
  { type: "vacuum", component: VacuumWidget },
];

export function getWidgetComponent(type: string): ComponentType<WidgetProps> | null {
  return widgetRegistry.find(w => w.type === type)?.component ?? null;
}
