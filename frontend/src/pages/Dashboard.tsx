import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboard,
  saveWidgets,
} from '../api';
import { useSectionDragDrop } from '../hooks/useSectionDragDrop';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { DashboardSection, DashboardState, WidgetInstance } from '../types';
import { getWidgetComponent } from '../widgets/registry';

function groupSections(sections: DashboardSection[]) {
  const groups: { sections: DashboardSection[]; flex: number }[] = [];
  let i = 0;
  while (i < sections.length) {
    const current = sections[i];
    if (current.paired && i + 1 < sections.length && sections[i + 1].paired) {
      const next = sections[i + 1];
      const totalFlex = (current.flex ?? 1) + (next.flex ?? 1);
      groups.push({ sections: [current, next], flex: totalFlex });
      i += 2;
    } else {
      groups.push({ sections: [current], flex: current.flex ?? 1 });
      i += 1;
    }
  }
  return groups;
}

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

  const sortedSections = useMemo(
    () => [...(state?.sections ?? [])].sort((a, b) => a.position - b.position),
    [state?.sections]
  );

  const sectionGroups = useMemo(() => groupSections(sortedSections), [sortedSections]);

  const { getSectionProps, getGridRef, getWidgetProps } = useSectionDragDrop(
    state?.sections ?? [],
    state?.widgets ?? [],
    handleReorder,
  );

  const renderSection = (section: DashboardSection) => {
    const sectionWidgets = state
      ? state.widgets
          .filter((w) => w.section === section.id)
          .sort((a, b) => a.position - b.position)
      : [];

    return (
      <div className="section__content" key={section.id}>
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
                <Component instance={widget} globalSettings={state!.globalSettings} />
              </div>
            );
          })}
          {sectionWidgets.length === 0 && (
            <div className="section__empty">Drop widgets here</div>
          )}
        </div>
      </div>
    );
  };

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

      <div className="dashboard__sections">
        {sectionGroups.map((group) => (
          <div
            key={group.sections.map(s => s.id).join('-')}
            className="dashboard__row"
            style={{ flex: group.flex }}
          >
            {group.sections.length === 1 ? (() => {
              const section = group.sections[0];
              const sp = getSectionProps(section.id);
              return (
                <div
                  className={`dashboard__section dashboard__section--single${sp.isOver ? ' dashboard__section--over' : ''}`}
                  onDragOver={sp.onDragOver}
                  onDrop={sp.onDrop}
                >
                  {renderSection(section)}
                </div>
              );
            })() : (
              group.sections.map((section) => {
                const sp = getSectionProps(section.id);
                return (
                  <div
                    className={`dashboard__section dashboard__section--half${sp.isOver ? ' dashboard__section--over' : ''}`}
                    key={section.id}
                    onDragOver={sp.onDragOver}
                    onDrop={sp.onDrop}
                  >
                    {renderSection(section)}
                  </div>
                );
              })
            )}
          </div>
        ))}

        {sectionGroups.length === 0 && (
          <div className="section__empty">Drop widgets here</div>
        )}
      </div>

      <Link to="/settings" className="dashboard__settings-link" aria-label="Settings">
        ⚙
      </Link>
    </div>
  );
}
