import type { ComponentType } from 'react';
import type { WidgetProps } from '../types';
import { AiQaWidget } from './ai-qa/Widget';
import { ClockWidget } from './clock/Widget';
import { GifsWidget } from './gifs/Widget';
import { WeatherWidget } from './weather/Widget';

export interface FrontendWidgetEntry {
  type: string;
  component: ComponentType<WidgetProps>;
  standalone?: boolean;
}

export const widgetRegistry: FrontendWidgetEntry[] = [
  { type: 'clock', component: ClockWidget, standalone: true },
  { type: 'weather', component: WeatherWidget },
  { type: 'gifs', component: GifsWidget },
  { type: 'ai-qa', component: AiQaWidget },
];

export function getWidgetComponent(type: string): ComponentType<WidgetProps> | null {
  return widgetRegistry.find((w) => w.type === type)?.component ?? null;
}

export function isStandaloneWidget(type: string): boolean {
  return widgetRegistry.find((w) => w.type === type)?.standalone ?? false;
}
