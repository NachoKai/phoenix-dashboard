import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import {
  useSectionDragDrop,
  SortableWidgetItem,
  DroppableSection,
  DroppableGroupButton,
  WidgetSortableContext,
} from "../hooks/useSectionDragDrop";
import { useUiStore } from "../stores/uiStore";
import { queryClient } from "../lib/queryClient";
import { createSection, saveDashboardState, saveWidgets } from "../api";
import type { DashboardSection, GlobalSettings, WidgetInstance } from "../types";
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

  const totalRows =
    fullWidths.length +
    Math.max(leftOnly.length, rightOnly.length, fullHeights.length > 0 ? 1 : 0);
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

function isInSleepRange(settings: GlobalSettings): boolean {
  if (!settings.sleepTimeEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = settings.sleepStartHour * 60 + settings.sleepStartMinute;
  const endMinutes = settings.sleepEndHour * 60 + settings.sleepEndMinute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function Dashboard() {
  const { state, error, updateState, persistState } = useDashboardQuery();
  const activeGroup = useUiStore(s => s.activeGroup);
  const sleeping = useUiStore(s => s.sleeping);
  const online = useUiStore(s => s.online);
  const setActiveGroup = useUiStore(s => s.setActiveGroup);
  const setSleeping = useUiStore(s => s.setSleeping);
  const setOnline = useUiStore(s => s.setOnline);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (online) {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [online]);

  useEffect(() => {
    if (!state?.globalSettings?.sleepTimeEnabled) {
      setSleeping(false);
      return;
    }

    const check = () => setSleeping(isInSleepRange(state.globalSettings));

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [state?.globalSettings]);

  useEffect(() => {
    if (state?.globalSettings?.activeGroup != null) {
      setActiveGroup(state.globalSettings.activeGroup);
    }
  }, [state?.globalSettings?.activeGroup]);

  const sortedSections = useMemo(
    () => [...(state?.sections ?? [])].sort((a, b) => a.position - b.position),
    [state?.sections],
  );

  const hasGroups = useMemo(
    () => sortedSections.some(s => s.group != null),
    [sortedSections],
  );

  const occupiedGroups = useMemo(
    () =>
      [
        ...new Set(
          sortedSections.filter(s => s.group != null).map(s => s.group as number),
        ),
      ].sort((a, b) => a - b),
    [sortedSections],
  );

  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetRotateTimer = useCallback(() => {
    if (rotateTimerRef.current != null) {
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    const interval = state?.globalSettings?.autoRotateInterval ?? 0;
    if (interval > 0 && occupiedGroups.length >= 2) {
      rotateTimerRef.current = setInterval(() => {
        const prev = useUiStore.getState().activeGroup;
        const idx = occupiedGroups.indexOf(prev);
        const nextIdx = (idx + 1) % occupiedGroups.length;
        const nextGroup = occupiedGroups[nextIdx];
        if (state) {
          const updated = {
            ...state,
            globalSettings: { ...state.globalSettings, activeGroup: nextGroup },
          };
          updateState(() => updated);
          persistState(updated);
        }
        setActiveGroup(nextGroup);
      }, interval * 1000);
    }
  }, [state, occupiedGroups, updateState, persistState]);

  useEffect(() => {
    resetRotateTimer();
    return () => {
      if (rotateTimerRef.current != null) clearInterval(rotateTimerRef.current);
    };
  }, [resetRotateTimer]);

  const handleGroupChange = useCallback(
    (group: number) => {
      setActiveGroup(group);
      if (state) {
        const updated = {
          ...state,
          globalSettings: { ...state.globalSettings, activeGroup: group },
        };
        updateState(() => updated);
        persistState(updated);
      }
      resetRotateTimer();
    },
    [state, resetRotateTimer, updateState, persistState],
  );

  const handleMoveWidgetToGroup = useCallback(
    async (widgetId: string, toGroup: number) => {
      if (!state) return;
      const widget = state.widgets.find(w => w.id === widgetId);
      if (!widget) return;

      let targetSection = state.sections.find(s => s.group === toGroup);
      if (!targetSection) {
        try {
          const { section } = await createSection();
          targetSection = { ...section, group: toGroup };
        } catch {
          return;
        }
      }

      const sourceSection = widget.section;
      const sourceWidgets = state.widgets
        .filter(w => w.section === sourceSection && w.id !== widgetId)
        .sort((a, b) => a.position - b.position);
      const targetWidgets = state.widgets
        .filter(w => w.section === targetSection!.id)
        .sort((a, b) => a.position - b.position);

      const movedWidget = { ...widget, section: targetSection!.id };
      const newTarget = [...targetWidgets, movedWidget].map((w, i) => ({
        ...w,
        position: i,
      }));
      const newSource = sourceWidgets.map((w, i) => ({ ...w, position: i }));

      const others = state.widgets.filter(
        w => w.section !== sourceSection && w.section !== targetSection!.id,
      );

      const needsNewSection = !state.sections.find(s => s.id === targetSection!.id);
      const updatedSections = needsNewSection
        ? [...state.sections, targetSection!]
        : state.sections;

      const reordered = [...others, ...newSource, ...newTarget].sort((a, b) => {
        if (a.section !== b.section) {
          const sA = updatedSections.find(s => s.id === a.section);
          const sB = updatedSections.find(s => s.id === b.section);
          return (sA?.position ?? 0) - (sB?.position ?? 0);
        }
        return a.position - b.position;
      });

      const updated = { ...state, widgets: reordered, sections: updatedSections };
      updateState(() => updated);
      void saveWidgets(reordered).catch(() => {});
      if (needsNewSection) {
        void saveDashboardState(updated).catch(() => {});
      }
    },
    [state, updateState],
  );

  useEffect(() => {
    if (state === null) return;
    const orientation = state.globalSettings?.orientation;
    const so = screen.orientation as any;
    if (!orientation || orientation === "auto") {
      so?.unlock?.();
      return;
    }
    if (!so?.lock) return;

    const lockOrientation = () => {
      so.lock(orientation).catch(() => {});
    };

    if (document.fullscreenElement) {
      lockOrientation();
    } else {
      document.documentElement
        .requestFullscreen()
        .then(lockOrientation)
        .catch(() => {});
    }
  }, [state?.globalSettings?.orientation]);

  const handleReorder = useCallback(
    (reordered: WidgetInstance[]) => {
      if (!state) return;
      updateState(() => ({ ...state, widgets: reordered }));
      void saveWidgets(reordered).catch(() => {});
    },
    [state, updateState],
  );

  const visibleSections = useMemo(
    () =>
      hasGroups
        ? sortedSections.filter(s => s.group === undefined || s.group === activeGroup)
        : sortedSections,
    [sortedSections, activeGroup, hasGroups],
  );

  const { placements: gridPlacements, totalRows } = useMemo(
    () => computeGrid(visibleSections),
    [visibleSections],
  );

  const {
    sensors,
    state: dragState,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    groupAwareCollisionDetection,
  } = useSectionDragDrop(
    sortedSections,
    state?.widgets ?? [],
    handleReorder,
    handleMoveWidgetToGroup,
  );

  const renderSection = useCallback(
    (section: DashboardSection) => {
      const sectionWidgets = state
        ? state.widgets
            .filter(w => w.section === section.id)
            .sort((a, b) => a.position - b.position)
        : [];

      const seen = new Set<string>();
      const uniqueSectionWidgets = sectionWidgets.filter(w => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
      });

      const widgetIds = uniqueSectionWidgets.map(w => w.id);

      return (
        <div className="section__content" key={section.id}>
          <div className="section__grid">
            <WidgetSortableContext widgetIds={widgetIds}>
              {uniqueSectionWidgets.map(widget => {
                const Component = getWidgetComponent(widget.type);
                if (!Component) {
                  return (
                    <SortableWidgetItem
                      key={widget.id}
                      widgetId={widget.id}
                    >
                      <div className="widget-card widget-card--error">
                        <p>Unknown widget: {widget.type}</p>
                      </div>
                    </SortableWidgetItem>
                  );
                }
                return (
                  <SortableWidgetItem
                    key={widget.id}
                    widgetId={widget.id}
                  >
                    <Suspense
                      fallback={
                        <div className="widget-card widget-card--loading">
                          <div className="widget-card__loading">Loading…</div>
                        </div>
                      }
                    >
                      <Component
                        instance={widget}
                        globalSettings={state!.globalSettings}
                        sleeping={sleeping}
                      />
                    </Suspense>
                  </SortableWidgetItem>
                );
              })}
            </WidgetSortableContext>
            {uniqueSectionWidgets.length === 0 && (
              <div className="section__empty">Drop widgets here</div>
            )}
          </div>
        </div>
      );
    },
    [state, sleeping],
  );

  if (!state && error) {
    return (
      <div className="dashboard dashboard--error">
        <p>{error.message}</p>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
        >
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
    <DndContext
      sensors={sensors}
      collisionDetection={groupAwareCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className={`dashboard theme-${state.globalSettings.theme} dashboard--has-groups`}
      >
        <nav className="group-sidebar" role="tablist" aria-label="Widget groups">
          {hasGroups &&
            [1, 2, 3, 4, 5, 6].map(g => {
              const isActive = g === activeGroup;
              const hasContent = sortedSections.some(s => s.group === g);
              return (
                <DroppableGroupButton
                  key={g}
                  group={g}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`group-sidebar__item${isActive ? " group-sidebar__item--active" : ""}${hasContent ? " group-sidebar__item--has-content" : ""}`}
                  onClick={() => handleGroupChange(g)}
                >
                  {g}
                </DroppableGroupButton>
              );
            })}
          <Link
            to="/settings"
            className="group-sidebar__item group-sidebar__settings"
            aria-label="Settings"
          >
            ⚙
          </Link>
        </nav>

        <div
          className="dashboard__grid"
          style={
            totalRows > 0 ? { gridTemplateRows: `repeat(${totalRows}, 1fr)` } : undefined
          }
        >
          {gridPlacements.length === 0 && (
            <div className="section__empty" style={{ gridColumn: "1 / -1" }}>
              No sections yet — add one in Settings
            </div>
          )}
          {gridPlacements.map(({ section, gridColumn, gridRow }) => (
            <DroppableSection
              key={section.id}
              sectionId={section.id}
              className="dashboard__section"
              style={{ gridColumn, gridRow }}
            >
              {renderSection(section)}
            </DroppableSection>
          ))}
        </div>

        {sleeping && <div className="sleep-overlay" />}
      </div>
      <DragOverlay>
        {dragState.dragWidgetId ? (
          <div className="drag-item drag-item--overlay">
            {(() => {
              const widget = state.widgets.find(w => w.id === dragState.dragWidgetId);
              if (!widget) return null;
              const Component = getWidgetComponent(widget.type);
              if (!Component) return null;
              return (
                <Component
                  instance={widget}
                  globalSettings={state.globalSettings}
                  sleeping={sleeping}
                />
              );
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
