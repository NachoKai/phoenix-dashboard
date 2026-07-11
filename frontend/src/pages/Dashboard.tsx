import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard, saveWidgets } from "../api";
import { useSectionDragDrop } from "../hooks/useSectionDragDrop";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { DashboardSection, DashboardState, WidgetInstance } from "../types";
import { getWidgetComponent } from "../widgets/registry";

interface GridPlacement {
  section: DashboardSection;
  gridColumn: string;
  gridRow: string;
}

interface GridResult {
  placements: GridPlacement[];
  totalRows: number;
}

function computeGrid(sections: DashboardSection[]): GridResult {
  const sorted = [...sections].sort((a, b) => a.position - b.position);
  const fullWidths = sorted.filter(s => !s.layout || s.layout === "full-width");
  const fullHeights = sorted.filter(
    s => s.layout === "left-full-height" || s.layout === "right-full-height",
  );
  const leftOnly = sorted.filter(s => s.layout === "left");
  const rightOnly = sorted.filter(s => s.layout === "right");

  const totalRows = fullWidths.length + Math.max(leftOnly.length, rightOnly.length, fullHeights.length > 0 ? 1 : 0);
  const placements: GridPlacement[] = [];

  let row = 1;
  for (const s of fullWidths) {
    placements.push({ section: s, gridColumn: "1 / -1", gridRow: `${row}` });
    row++;
  }

  const pairCount = Math.max(leftOnly.length, rightOnly.length);
  for (let i = 0; i < pairCount; i++) {
    const r = row + i;
    if (i < leftOnly.length) {
      placements.push({ section: leftOnly[i], gridColumn: "1", gridRow: `${r}` });
    }
    if (i < rightOnly.length) {
      placements.push({ section: rightOnly[i], gridColumn: "2", gridRow: `${r}` });
    }
  }

  for (const s of fullHeights) {
    const col = s.layout === "left-full-height" ? "1" : "2";
    placements.push({
      section: s,
      gridColumn: col,
      gridRow: totalRows > 0 ? `1 / ${totalRows + 1}` : "1",
    });
  }

  return { placements, totalRows };
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
      setError(err instanceof Error ? err.message : "Failed to load");
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

  useEffect(() => {
    const orientation = state?.globalSettings?.orientation;
    const so = screen.orientation as any;
    if (!orientation || orientation === "auto") {
      so?.unlock?.();
    } else if (so?.lock) {
      so.lock(orientation).catch(() => {});
    }
  }, [state?.globalSettings?.orientation]);

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
    [state?.sections],
  );

  const { placements: gridPlacements, totalRows } = useMemo(
    () => computeGrid(sortedSections),
    [sortedSections],
  );

  const { getSectionProps, getGridRef, getWidgetProps } = useSectionDragDrop(
    state?.sections ?? [],
    state?.widgets ?? [],
    handleReorder,
  );

  const renderSection = (section: DashboardSection) => {
    const sectionWidgets = state
      ? state.widgets
          .filter(w => w.section === section.id)
          .sort((a, b) => a.position - b.position)
      : [];

    return (
      <div className="section__content" key={section.id}>
        <div className="section__grid" ref={getGridRef(section.id)}>
          {sectionWidgets.map(widget => {
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

      <div
        className="dashboard__grid"
        style={totalRows > 0 ? { gridTemplateRows: `repeat(${totalRows}, 1fr)` } : undefined}
      >
        {gridPlacements.length === 0 && (
          <div className="section__empty" style={{ gridColumn: '1 / -1' }}>
            No sections yet — add one in Settings
          </div>
        )}
        {gridPlacements.map(({ section, gridColumn, gridRow }) => {
          const sp = getSectionProps(section.id);
          return (
            <div
              key={section.id}
              className={`dashboard__section${sp.isOver ? " dashboard__section--over" : ""}`}
              style={{ gridColumn, gridRow }}
              onDragOver={sp.onDragOver}
              onDrop={sp.onDrop}
            >
              {renderSection(section)}
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
