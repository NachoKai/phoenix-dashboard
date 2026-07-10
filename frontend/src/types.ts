export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'string-list';

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
  config: Record<string, unknown>;
}

export interface GlobalSettings {
  theme: 'dark' | 'light';
  defaultRefreshInterval: number;
  settingsPin?: string;
}

export interface DashboardState {
  widgets: WidgetInstance[];
  globalSettings: GlobalSettings;
}

export interface WidgetProps {
  instance: WidgetInstance;
  globalSettings: GlobalSettings;
}

export type WidgetStatus = 'loading' | 'success' | 'error' | 'stale';

export interface WidgetState<T> {
  data: T | null;
  status: WidgetStatus;
  error: string | null;
  lastUpdated: Date | null;
}
