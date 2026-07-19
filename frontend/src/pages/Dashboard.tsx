import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Suspense, useCallback, useContext, useEffect } from "react";
import styled from "styled-components";
import { DashboardError } from "../components/DashboardError";
import { DashboardLoading } from "../components/DashboardLoading";
import { GroupSidebar } from "../components/GroupSidebar";
import { SleepOverlay } from "../components/SleepOverlay";
import { useAutoRotate } from "../hooks/useAutoRotate";
import { useDashboardDerivedState } from "../hooks/useDashboardDerivedState";
import { useDashboardQuery } from "../hooks/useDashboardQuery";
import {
  useCreateSectionMutation,
  useSaveDashboardStateMutation,
  useSaveWidgetsMutation,
} from "../hooks/useDashboardMutations";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useOrientationLock } from "../hooks/useOrientationLock";
import {
  DroppableSection,
  SortableWidgetItem,
  useSectionDragDrop,
  WidgetSortableContext,
  DragOverlayItem,
} from "../hooks/useSectionDragDrop";
import { useSleepMode } from "../hooks/useSleepMode";
import { useUiStore } from "../stores/uiStore";
import { ThemeModeContext } from "../styles/theme";
import type { DashboardSection, DashboardState, WidgetInstance } from "../types";
import { getDeviceId } from "../utils/deviceId";
import { getWidgetComponent } from "../widgets/registry";

export function Dashboard() {
  const deviceId = getDeviceId();
  const { state, error, updateState, persistState } = useDashboardQuery();
  const activeGroup = useUiStore(s => s.activeGroup);
  const sleeping = useUiStore(s => s.sleeping);
  const online = useUiStore(s => s.online);
  const setActiveGroup = useUiStore(s => s.setActiveGroup);
  const setSleeping = useUiStore(s => s.setSleeping);
  const setOnline = useUiStore(s => s.setOnline);
  const { setThemeMode } = useContext(ThemeModeContext);

  const createSectionMutation = useCreateSectionMutation();
  const saveWidgetsMutation = useSaveWidgetsMutation();
  const saveDashboardStateMutation = useSaveDashboardStateMutation();

  useOnlineStatus(online, setOnline);
  useSleepMode(state?.globalSettings, setSleeping);
  useOrientationLock(state?.globalSettings?.orientation);

  useEffect(() => {
    if (state?.globalSettings?.activeGroup != null) {
      setActiveGroup(state.globalSettings.activeGroup);
    }
  }, [state?.globalSettings?.activeGroup]);

  useEffect(() => {
    if (state?.globalSettings?.theme) {
      setThemeMode(state.globalSettings.theme);
    }
  }, [state?.globalSettings?.theme, setThemeMode]);

  const { sortedSections, hasGroups, occupiedGroups, gridPlacements, totalRows } =
    useDashboardDerivedState(state, activeGroup);

  const resetRotateTimer = useAutoRotate(
    state,
    occupiedGroups,
    updateState,
    persistState,
    setActiveGroup,
  );

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
          const { section } = await createSectionMutation.mutateAsync();
          targetSection = { ...section, group: toGroup };
        } catch {
          console.error("[dashboard] Failed to create section");
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
      saveWidgetsMutation.mutate(reordered);
      if (needsNewSection) {
        saveDashboardStateMutation.mutate(updated);
      }
    },
    [
      state,
      updateState,
      createSectionMutation,
      saveWidgetsMutation,
      saveDashboardStateMutation,
    ],
  );

  const handleGroupsReorder = useCallback(
    (activeGroup: number, overGroup: number) => {
      if (!state) return;

      const ordered = [...occupiedGroups];
      const fromIdx = ordered.indexOf(activeGroup);
      const toIdx = ordered.indexOf(overGroup);
      if (fromIdx === -1 || toIdx === -1) return;

      ordered.splice(fromIdx, 1);
      ordered.splice(toIdx, 0, activeGroup);

      const groupMapping: Record<number, number> = {};
      ordered.forEach((oldGroup, index) => {
        groupMapping[oldGroup] = index + 1;
      });

      const updatedSections = state.sections.map(s => ({
        ...s,
        group: s.group != null ? (groupMapping[s.group] ?? s.group) : s.group,
      }));

      const newActiveGroup = groupMapping[activeGroup] ?? activeGroup;

      const updated: DashboardState = {
        ...state,
        sections: updatedSections,
        globalSettings: { ...state.globalSettings, activeGroup: newActiveGroup },
      };
      updateState(() => updated);
      persistState(updated);
      setActiveGroup(newActiveGroup);
      resetRotateTimer();
    },
    [state, occupiedGroups, updateState, persistState, setActiveGroup, resetRotateTimer],
  );

  const handleReorder = useCallback(
    (reordered: WidgetInstance[]) => {
      if (!state) return;
      updateState(() => ({ ...state, widgets: reordered }));
      saveWidgetsMutation.mutate(reordered);
    },
    [state, updateState, saveWidgetsMutation],
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
    handleGroupsReorder,
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
        <SectionContent key={section.id}>
          <SectionGrid>
            <WidgetSortableContext widgetIds={widgetIds}>
              {uniqueSectionWidgets.map(widget => {
                const Component = getWidgetComponent(widget.type);
                if (!Component) {
                  return (
                    <SortableWidgetItem key={widget.id} widgetId={widget.id}>
                      <UnknownWidget>Unknown widget: {widget.type}</UnknownWidget>
                    </SortableWidgetItem>
                  );
                }
                return (
                  <SortableWidgetItem
                    key={widget.id}
                    widgetId={widget.id}
                    dragHandle={[
                      "ai-qa",
                      "bubble-wrap",
                      "touch-ripple",
                      "fidget-spinner",
                      "bubble-pop",
                      "ambient-soundboard",
                      "tonal-drone",
                      "gradient-shift",
                      "zen-bell",
                      "color-calm",
                      "lava-lamp",
                      "aquarium",
                      "bubble-level",
                      "rolling-ball",
                    ].includes(widget.type)}
                  >
                    <Suspense
                      fallback={
                        <LoadingCard>
                          <Spinner />
                        </LoadingCard>
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
            {uniqueSectionWidgets.length === 0 && <Empty>Drop widgets here</Empty>}
          </SectionGrid>
        </SectionContent>
      );
    },
    [state, sleeping],
  );

  if (!state && error) {
    return <DashboardError error={error} deviceId={deviceId} />;
  }

  if (!state) {
    return <DashboardLoading />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={groupAwareCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Wrapper $hasGroups={hasGroups}>
        <GroupSidebar
          hasGroups={hasGroups}
          occupiedGroups={occupiedGroups}
          activeGroup={activeGroup}
          sortedSections={sortedSections}
          onGroupChange={handleGroupChange}
        />

        <Grid
          style={
            totalRows > 0 ? { gridTemplateRows: `repeat(${totalRows}, 1fr)` } : undefined
          }
        >
          {gridPlacements.length === 0 && (
            <Empty style={{ gridColumn: "1 / -1" }}>
              No sections yet — add one in Settings
            </Empty>
          )}
          {gridPlacements.map(({ section, gridColumn, gridRow }) => (
            <DroppableSection
              key={section.id}
              sectionId={section.id}
              style={{ gridColumn, gridRow }}
            >
              {renderSection(section)}
            </DroppableSection>
          ))}
        </Grid>

        {sleeping && <SleepOverlay />}
      </Wrapper>

      <DragOverlay>
        {dragState.dragWidgetId ? (
          <DragOverlayItem>
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
          </DragOverlayItem>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const Wrapper = styled.div<{ $hasGroups: boolean }>`
  width: 100%;
  height: 100%;
  height: 100dvh;
  padding: 2px calc(2px + env(safe-area-inset-right, 0px)) 2px
    calc(2px + env(safe-area-inset-left, 0px));
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  ${({ $hasGroups }) =>
    $hasGroups &&
    `
    @media (orientation: landscape) and (max-height: 500px) {
      flex-direction: row;
      padding-left: 0;
    }
    @media (orientation: portrait) and (max-width: 480px) {
      flex-direction: column;
    }
    @media (orientation: landscape) and (max-height: 400px) {
      flex-direction: row;
    }
  `}
`;

const Grid = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
`;

const SectionContent = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 4px;
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 2px;
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;

  @media (orientation: landscape) and (max-height: 500px) {
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
    gap: 2px;
  }
  @media (orientation: portrait) and (max-width: 480px) {
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
    gap: 2px;
  }
  @media (orientation: landscape) and (max-height: 400px) {
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
    gap: 2px;
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    gap: 12px;
  }
`;

const Empty = styled.div`
  grid-column: 1 / -1;
  border: 1px dashed ${({ theme }) => theme.border};
  padding: 6px;
  text-align: center;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UnknownWidget = styled.div`
  background: transparent;
  border: none;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  container-type: inline-size;
`;

const LoadingCard = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid ${({ theme }) => theme.border};
  border-top-color: ${({ theme }) => theme.accent};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
