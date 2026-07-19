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
  {
    type: "bubble-wrap",
    component: lazy(() =>
      import("./bubble-wrap/Widget").then(m => ({
        default: m.BubbleWrapWidget,
      })),
    ),
  },
  {
    type: "touch-ripple",
    component: lazy(() =>
      import("./touch-ripple/Widget").then(m => ({
        default: m.TouchRippleWidget,
      })),
    ),
  },
  {
    type: "fidget-spinner",
    component: lazy(() =>
      import("./fidget-spinner/Widget").then(m => ({
        default: m.FidgetSpinnerWidget,
      })),
    ),
  },
  {
    type: "bubble-pop",
    component: lazy(() =>
      import("./bubble-pop/Widget").then(m => ({
        default: m.BubblePopWidget,
      })),
    ),
  },
  {
    type: "ambient-soundboard",
    component: lazy(() =>
      import("./ambient-soundboard/Widget").then(m => ({
        default: m.AmbientSoundboardWidget,
      })),
    ),
  },
  {
    type: "tonal-drone",
    component: lazy(() =>
      import("./tonal-drone/Widget").then(m => ({
        default: m.TonalDroneWidget,
      })),
    ),
  },
  {
    type: "bubble-level",
    component: lazy(() =>
      import("./bubble-level/Widget").then(m => ({
        default: m.BubbleLevelWidget,
      })),
    ),
  },
  {
    type: "rolling-ball",
    component: lazy(() =>
      import("./rolling-ball/Widget").then(m => ({
        default: m.RollingBallWidget,
      })),
    ),
  },
  {
    type: "gradient-shift",
    component: lazy(() =>
      import("./gradient-shift/Widget").then(m => ({
        default: m.GradientShiftWidget,
      })),
    ),
  },
  {
    type: "zen-bell",
    component: lazy(() =>
      import("./zen-bell/Widget").then(m => ({
        default: m.ZenBellWidget,
      })),
    ),
  },
  {
    type: "lava-lamp",
    component: lazy(() =>
      import("./lava-lamp/Widget").then(m => ({
        default: m.LavaLampWidget,
      })),
    ),
  },
  {
    type: "color-calm",
    component: lazy(() =>
      import("./color-calm/Widget").then(m => ({
        default: m.ColorCalmWidget,
      })),
    ),
  },
  {
    type: "aquarium",
    component: lazy(() =>
      import("./aquarium/Widget").then(m => ({
        default: m.AquariumWidget,
      })),
    ),
  },
];

const widgetMap = new Map(widgetRegistry.map(e => [e.type, e.component]));

export function getWidgetComponent(type: string): ComponentType<WidgetProps> | null {
  return widgetMap.get(type) ?? null;
}
