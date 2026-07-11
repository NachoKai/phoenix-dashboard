export type ConfigFieldType =  | "string"
  | "number"
  | "boolean"
  | "select"
  | "secret"
  | "string-list";

export interface ConfigFieldSchema {
  key: string;
  label: string;
  type: ConfigFieldType;
  default?: string | number | boolean | string[];
  options?: { value: string; label: string }[];
  description?: string;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  configSchema: ConfigFieldSchema[];
  defaultConfig: Record<string, unknown>;
  hasBackendRoute: boolean;
}

export interface WidgetInstance {
  id: string;
  type: string;
  position: number;
  section: string;
  config: Record<string, unknown>;
}

export type SectionLayout =
  | "full-width"
  | "left"
  | "right"
  | "left-full-height"
  | "right-full-height";

export interface DashboardSection {
  id: string;
  name: string;
  position: number;
  flex?: number;
  layout?: SectionLayout;
  group?: number;
}

export interface GlobalSettings {
  theme: "dark" | "light";
  defaultRefreshInterval: number;
  orientation: "auto" | "portrait" | "landscape";
  activeGroup: number;
}

export interface DashboardState {
  widgets: WidgetInstance[];
  sections: DashboardSection[];
  globalSettings: GlobalSettings;
}

export interface WidgetProps {
  instance: WidgetInstance;
  globalSettings: GlobalSettings;
}

export type WidgetStatus = "loading" | "success" | "error" | "stale";

export interface WidgetState<T> {
  data: T | null;
  status: WidgetStatus;
  error: string | null;
  lastUpdated: Date | null;
}
