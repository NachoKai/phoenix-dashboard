import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard, saveWidgets } from '../api';
import { useDragReorder } from '../hooks/useDragReorder';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { DashboardState, WidgetInstance } from '../types';
import { getWidgetComponent } from '../widgets/registry';

export function Dashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const online = useOnlineStatus();

  const load = async () => {
    try {
      const data = await fetchDashboard();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (online) void load();
  }, [online]);

  const handleReorder = (reordered: WidgetInstance[]) => {
    if (!state) return;
    const updated = reordered.map((w, i) => ({ ...w, position: i }));
    setState({ ...state, widgets: updated });
    // Persist in background — don't block the UI
    void saveWidgets(updated).catch(() => {
      /* silent — will sync on next settings save */
    });
  };

  const { containerRef, getItemProps } = useDragReorder(
    state?.widgets ?? [],
    handleReorder,
  );

  if (!state && error) {
    return (
      <div className="dashboard dashboard--error">
        <p>{error}</p>
        <button type="button" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="dashboard dashboard--loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`dashboard theme-${state.globalSettings.theme}`}>
      {!online && <div className="offline-banner">Offline — showing cached data</div>}

      <div className="dashboard__grid" ref={containerRef}>
        {state.widgets.map((widget, index) => {
          const Component = getWidgetComponent(widget.type);
          if (!Component) {
            return (
              <div key={widget.id} {...getItemProps(index)}>
                <div className="widget-card widget-card--error">
                  <p>Unknown widget: {widget.type}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={widget.id} {...getItemProps(index)}>
              <Component
                instance={widget}
                globalSettings={state.globalSettings}
              />
            </div>
          );
        })}
      </div>

      <Link to="/settings" className="dashboard__settings-link" aria-label="Settings">
        ⚙
      </Link>
    </div>
  );
}
