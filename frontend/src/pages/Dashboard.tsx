import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboard,
  saveWidgets,
} from '../api';
import { useSectionDragDrop } from '../hooks/useSectionDragDrop';
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

  const handleReorder = useCallback(
    (reordered: WidgetInstance[]) => {
      if (!state) return;
      setState({ ...state, widgets: reordered });
      void saveWidgets(reordered).catch(() => {});
    },
    [state],
  );

  const { getSectionProps, getGridRef, getWidgetProps } = useSectionDragDrop(
    state?.sections ?? [],
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

  const sortedSections = [...state.sections].sort((a, b) => a.position - b.position);

  return (
    <div className={`dashboard theme-${state.globalSettings.theme}`}>
      {!online && <div className="offline-banner">Offline — showing cached data</div>}

      <div className="dashboard__sections">
        {sortedSections.map((section) => {
          const sectionWidgets = state.widgets
            .filter((w) => w.section === section.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={section.id} {...getSectionProps(section.id)}>
              <div className="section__grid" ref={getGridRef(section.id)}>
                {sectionWidgets.map((widget) => {
                  const Component = getWidgetComponent(widget.type);
                  if (!Component) {
                    return (
                      <div key={widget.id} {...getWidgetProps(widget.id, section.id)}>
                        <div className="widget-card widget-card--error">
                          <p>Unknown widget: {widget.type}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={widget.id} {...getWidgetProps(widget.id, section.id)}>
                      <Component instance={widget} globalSettings={state.globalSettings} />
                    </div>
                  );
                })}
                {sectionWidgets.length === 0 && (
                  <div className="section__empty">Drop widgets here</div>
                )}
              </div>
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
