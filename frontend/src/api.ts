const API_BASE = '/api';

export async function fetchDashboard(): Promise<import('./types').DashboardState> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function fetchWidgetRegistry(): Promise<import('./types').WidgetDefinition[]> {
  const res = await fetch(`${API_BASE}/widgets/registry`);
  if (!res.ok) throw new Error('Failed to load widget registry');
  return res.json();
}

export async function saveWidgets(
  widgets: import('./types').WidgetInstance[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/widgets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgets }),
  });
  if (!res.ok) throw new Error('Failed to save widgets');
}

export async function saveGlobalSettings(
  settings: import('./types').GlobalSettings,
): Promise<void> {
  const res = await fetch(`${API_BASE}/dashboard/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
}

export async function saveApiKey(
  widgetId: string,
  keyName: string,
  value: string,
): Promise<{ masked: string }> {
  const res = await fetch(`${API_BASE}/dashboard/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetId, keyName, value }),
  });
  if (!res.ok) throw new Error('Failed to save API key');
  return res.json();
}

export async function checkStoredKey(
  widgetId: string,
  keyName: string,
): Promise<{ hasValue: boolean; masked?: string }> {
  const res = await fetch(`${API_BASE}/dashboard/keys/${widgetId}/${keyName}`);
  if (!res.ok) return { hasValue: false };
  return res.json();
}

export async function isPinRequired(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/settings/pin-required`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.required === true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/settings/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.ok === true;
}

export async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError ?? new Error('Request failed');
}
