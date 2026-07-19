import { useCallback, useContext, createContext, useRef, useState } from "react";
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styled, { css } from "styled-components";
import type { DashboardSection, WidgetInstance } from "../types";

// ─── State ─────────────────────────────────────────────────────

export interface SectionDragState {
  dragWidgetId: string | null;
  dragFromSection: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────

export function useSectionDragDrop(
  sections: DashboardSection[],
  widgets: WidgetInstance[],
  onReorder: (widgets: WidgetInstance[]) => void,
  onMoveWidgetToGroup?: (widgetId: string, toGroup: number) => void,
  onGroupsReorder?: (activeGroup: number, overGroup: number) => void,
) {
  const [state, setState] = useState<SectionDragState>({
    dragWidgetId: null,
    dragFromSection: null,
  });

  const activeRef = useRef<{ id: string; sectionId: string } | null>(null);

  const moveWidget = useCallback(
    (widgetId: string, toSection: string, toIndex: number) => {
      const widget = widgets.find(w => w.id === widgetId);
      if (!widget) return;

      const fromSection = widget.section;

      if (fromSection === toSection) {
        const sectionWidgets = widgets
          .filter(w => w.section === fromSection)
          .sort((a, b) => a.position - b.position);
        const fromIdx = sectionWidgets.findIndex(w => w.id === widgetId);
        const clampedTo = Math.min(toIndex, sectionWidgets.length - 1);
        if (fromIdx === -1 || fromIdx === clampedTo) return;

        const reordered = arrayMove(sectionWidgets, fromIdx, clampedTo);
        const reindexed = reordered.map((w, i) => ({ ...w, position: i }));
        const others = widgets.filter(w => w.section !== fromSection);
        const final = [...others, ...reindexed].sort((a, b) => {
          if (a.section !== b.section) {
            const sA = sections.find(s => s.id === a.section);
            const sB = sections.find(s => s.id === b.section);
            return (sA?.position ?? 0) - (sB?.position ?? 0);
          }
          return a.position - b.position;
        });
        onReorder(final);
      } else {
        const sourceWidgets = widgets
          .filter(w => w.section === fromSection && w.id !== widgetId)
          .sort((a, b) => a.position - b.position);
        const targetWidgets = widgets
          .filter(w => w.section === toSection)
          .sort((a, b) => a.position - b.position);

        const insertAt =
          toIndex < 0 ? targetWidgets.length : Math.min(toIndex, targetWidgets.length);
        const updatedTarget = [...targetWidgets];
        updatedTarget.splice(insertAt, 0, { ...widget, section: toSection });

        const reindexedSource = sourceWidgets.map((w, i) => ({ ...w, position: i }));
        const reindexedTarget = updatedTarget.map((w, i) => ({ ...w, position: i }));
        const others = widgets.filter(
          w => w.section !== fromSection && w.section !== toSection,
        );
        const final = [...others, ...reindexedSource, ...reindexedTarget].sort((a, b) => {
          if (a.section !== b.section) {
            const sA = sections.find(s => s.id === a.section);
            const sB = sections.find(s => s.id === b.section);
            return (sA?.position ?? 0) - (sB?.position ?? 0);
          }
          return a.position - b.position;
        });
        onReorder(final);
      }
    },
    [widgets, sections, onReorder],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const widgetId = String(event.active.id);
      const widget = widgets.find(w => w.id === widgetId);

      if (!widget) return;

      activeRef.current = { id: widgetId, sectionId: widget.section };
      setState({ dragWidgetId: widgetId, dragFromSection: widget.section });
    },
    [widgets],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active && over) {
        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId.startsWith("group-btn-") && overId.startsWith("group-")) {
          const activeGroupNum = parseInt(activeId.replace("group-btn-", ""), 10);
          const overGroupNum = parseInt(overId.replace("group-", ""), 10);
          if (activeGroupNum !== overGroupNum) {
            onGroupsReorder?.(activeGroupNum, overGroupNum);
          }
        }
        else if (overId.startsWith("group-") && activeRef.current) {
          const groupNum = parseInt(overId.replace("group-", ""), 10);
          onMoveWidgetToGroup?.(activeId, groupNum);
        }
        else if (overId.startsWith("section-") && activeRef.current) {
          const sectionId = overId.replace("section-", "");
          moveWidget(activeId, sectionId, -1);
        }
        else if (activeRef.current) {
          const overWidget = widgets.find(w => w.id === overId);
          const activeWidget = widgets.find(w => w.id === activeId);

          if (overWidget && activeWidget) {
            const targetSection = overWidget.section;
            const sectionWidgets = widgets
              .filter(w => w.section === targetSection)
              .sort((a, b) => a.position - b.position);
            const overIndex = sectionWidgets.findIndex(w => w.id === overId);

            if (overIndex >= 0) {
              moveWidget(activeId, targetSection, overIndex);
            }
          }
        }
      }

      activeRef.current = null;
      setState({ dragWidgetId: null, dragFromSection: null });
    },
    [widgets, moveWidget, onMoveWidgetToGroup, onGroupsReorder],
  );

  const handleDragCancel = useCallback(() => {
    activeRef.current = null;
    setState({ dragWidgetId: null, dragFromSection: null });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
      preventActivation: () => false,
    }),
    useSensor(KeyboardSensor),
  );

  const groupAwareCollisionDetection: CollisionDetection = useCallback(args => {
    const pointerCollisions = pointerWithin(args);
    const groupCollision = pointerCollisions.find(c => String(c.id).startsWith("group-"));
    if (groupCollision) return [groupCollision];

    const rectCollisions = rectIntersection(args);

    const widgetCollision = rectCollisions.find(
      c => !String(c.id).startsWith("section-") && !String(c.id).startsWith("group-"),
    );
    if (widgetCollision) return [widgetCollision];

    if (rectCollisions.length > 0) return [rectCollisions[0]];

    const pointerSectionCollision = pointerCollisions.find(c =>
      String(c.id).startsWith("section-"),
    );
    if (pointerSectionCollision) return [pointerSectionCollision];

    return [];
  }, []);

  return {
    sensors,
    state,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    groupAwareCollisionDetection,
  };
}

// ─── Styled components ──────────────────────────────────────────

const sectionOverCss = css`
  background: rgba(108, 140, 255, 0.04);
`;

export const SectionDiv = styled.div<{ $isOver?: boolean }>`
  width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: background 0.2s ease;
  ${({ $isOver }) => $isOver && sectionOverCss}
`;

// ─── DroppableSection ──────────────────────────────────────────

export function DroppableSection({
  sectionId,
  children,
  className = "",
  style,
}: {
  sectionId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}`,
  });

  return (
    <SectionDiv
      ref={setNodeRef}
      $isOver={isOver}
      className={className}
      style={style}
    >
      {children}
    </SectionDiv>
  );
}

// ─── DraggableGroupButton ──────────────────────────────────────

const GroupBtn = styled.button<{
  $active?: boolean;
  $hasContent?: boolean;
  $isOver?: boolean;
  $isDragging?: boolean;
}>`
  flex: 1;
  min-width: 35px;
  min-height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, theme }) => ($active ? theme.accent : "transparent")};
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ $active, theme }) => ($active ? "#fff" : theme.textMuted)};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  @media (orientation: landscape) and (max-height: 500px) {
    min-height: 0;
    flex: 1;
  }

  @media (orientation: landscape) and (max-height: 400px) {
    min-height: 0;
    flex: 1;
    font-size: 0.7rem;
  }

  &:hover {
    color: ${({ $active }) => ($active ? "#fff" : undefined)};
  }

  ${({ $hasContent, theme }) =>
    $hasContent &&
    css`
      &::after {
        content: "";
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        background: ${theme.textMuted};
      }
    `}

  ${({ $active, $hasContent }) =>
    $active &&
    $hasContent &&
    css`
      &::after {
        background: rgba(255, 255, 255, 0.6);
      }
    `}

  ${({ $isOver }) =>
    $isOver &&
    css`
      background: rgba(108, 140, 255, 0.15);
      transform: scale(1.08);
      box-shadow: 0 0 12px rgba(108, 140, 255, 0.3);
    `}
`;

export function DraggableGroupButton({
  group,
  children,
  $active,
  $hasContent,
  ...buttonProps
}: {
  group: number;
  children: React.ReactNode;
  $active?: boolean;
  $hasContent?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `group-btn-${group}`,
    data: { group },
  });

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `group-${group}`,
    data: { group },
  });

  const setNodeRef = (el: HTMLElement | null) => {
    setDraggableNodeRef(el);
    setDroppableNodeRef(el);
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <GroupBtn
      ref={setNodeRef}
      style={style}
      $active={$active}
      $hasContent={$hasContent}
      $isOver={isOver}
      $isDragging={isDragging}
      {...attributes}
      {...listeners}
      {...buttonProps}
    >
      {children}
    </GroupBtn>
  );
}

// ─── Drag handle context ────────────────────────────────────────

interface SortableHandleContextValue {
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  listeners: any;
  attributes: any;
}

const SortableHandleContext = createContext<SortableHandleContextValue | null>(null);

export function useSortableHandle() {
  return useContext(SortableHandleContext);
}

// ─── DragHandle ────────────────────────────────────────────────

const HandleWrapper = styled.div`
  cursor: grab;
  touch-action: none;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;

  &:active {
    cursor: grabbing;
  }

  &::after {
    content: "⠿";
    margin-left: auto;
    font-size: 1.2em;
    color: ${({ theme }) => theme.textMuted};
    opacity: 0.5;
    line-height: 1;
    flex-shrink: 0;
  }
`;

export function DragHandle({ children }: { children: React.ReactNode }) {
  const ctx = useSortableHandle();
  if (!ctx) return <div>{children}</div>;

  return (
    <HandleWrapper
      ref={ctx.setActivatorNodeRef}
      {...ctx.listeners}
      {...ctx.attributes}
    >
      {children}
    </HandleWrapper>
  );
}

// ─── SortableWidgetItem ────────────────────────────────────────

const SortableItem = styled.div<{ $isDragging?: boolean; $hasHandle?: boolean }>`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  touch-action: none;
  position: relative;
  ${({ $isDragging }) =>
    $isDragging &&
    css`
      opacity: 0.2;
      transform: scale(0.95);
    `}
  ${({ $hasHandle }) =>
    $hasHandle
      ? css`
          cursor: default;
          &:active {
            cursor: default;
          }
        `
      : css`
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        `}

  & .widget-card__body,
  & .widget-card__body *,
  & button,
  & input,
  & select,
  & textarea,
  & [role="button"] {
    touch-action: none;
  }

  ${({ $hasHandle }) =>
    $hasHandle &&
    css`
      & .widget-card__body,
      & .widget-card__body * {
        touch-action: auto;
      }
    `}

  & > article {
    min-width: unset;
    max-width: unset;
    width: 100%;
    height: 100%;
  }
`;

export const DragOverlayItem = styled.div`
  opacity: 0.92;
  transform: scale(1.03);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  border-radius: 14px;
  pointer-events: none;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: grab;
  touch-action: none;
  position: relative;

  & > .widget-card,
  & > article {
    min-width: unset;
    max-width: unset;
    width: 100%;
    height: 100%;
  }
`;

export function SortableWidgetItem({
  widgetId,
  children,
  dragHandle,
}: {
  widgetId: string;
  children: React.ReactNode;
  dragHandle?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  if (dragHandle) {
    return (
      <SortableItem
        ref={setNodeRef}
        style={style}
        $isDragging={isDragging}
        $hasHandle={true}
      >
        <SortableHandleContext.Provider
          value={{ setActivatorNodeRef, listeners, attributes }}
        >
          {children}
        </SortableHandleContext.Provider>
      </SortableItem>
    );
  }

  return (
    <SortableItem
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      $hasHandle={false}
      {...attributes}
      {...listeners}
    >
      {children}
    </SortableItem>
  );
}

// ─── WidgetSortableContext ─────────────────────────────────────

export function WidgetSortableContext({
  widgetIds,
  children,
}: {
  widgetIds: string[];
  children: React.ReactNode;
}) {
  return (
    <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
      {children}
    </SortableContext>
  );
}
