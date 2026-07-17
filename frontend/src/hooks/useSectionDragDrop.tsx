import { useCallback, useContext, createContext, useRef, useState } from "react";
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
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
        // ── Within-section reorder ──
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
        // ── Cross-section move ──
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

      if (activeRef.current && over) {
        const activeWidgetId = String(active.id);
        const overId = String(over.id);

        // ── Dropped on a group button ──
        if (overId.startsWith("group-")) {
          const groupNum = parseInt(overId.replace("group-", ""), 10);
          onMoveWidgetToGroup?.(activeWidgetId, groupNum);
        }
        // ── Dropped on an empty section area ──
        else if (overId.startsWith("section-")) {
          const sectionId = overId.replace("section-", "");
          moveWidget(activeWidgetId, sectionId, -1); // append to end
        }
        // ── Dropped on another widget ──
        else {
          const overWidget = widgets.find(w => w.id === overId);
          const activeWidget = widgets.find(w => w.id === activeWidgetId);

          if (overWidget && activeWidget) {
            const targetSection = overWidget.section;
            const sectionWidgets = widgets
              .filter(w => w.section === targetSection)
              .sort((a, b) => a.position - b.position);
            const overIndex = sectionWidgets.findIndex(w => w.id === overId);

            if (overIndex >= 0) {
              moveWidget(activeWidgetId, targetSection, overIndex);
            }
          }
        }
      }

      activeRef.current = null;
      setState({ dragWidgetId: null, dragFromSection: null });
    },
    [widgets, moveWidget, onMoveWidgetToGroup],
  );

  const handleDragCancel = useCallback(() => {
    activeRef.current = null;
    setState({ dragWidgetId: null, dragFromSection: null });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
      // By default, PointerSensor prevents drag on interactive elements
      // (buttons, inputs, selects, textareas). We override that here so
      // widgets with buttons/inputs can still be dragged. The distance: 5
      // constraint ensures a simple click/tap still triggers the element's
      // native behavior without starting a drag.
      preventActivation: () => false,
    }),
    useSensor(KeyboardSensor),
  );

  // Pure collision detection — no side effects
  const groupAwareCollisionDetection: CollisionDetection = useCallback(args => {
    // 1. Check pointer collisions first (for small targets like group buttons)
    const pointerCollisions = pointerWithin(args);
    const groupCollision = pointerCollisions.find(c => String(c.id).startsWith("group-"));
    if (groupCollision) return [groupCollision];

    // 2. Use rectIntersection to find all overlapping droppables
    const rectCollisions = rectIntersection(args);

    // 3. Prefer sortable items (widgets) over section droppables.
    //    This prevents a section droppable from "stealing" the collision
    //    from the actual widget underneath the pointer.
    const widgetCollision = rectCollisions.find(
      c => !String(c.id).startsWith("section-") && !String(c.id).startsWith("group-"),
    );
    if (widgetCollision) return [widgetCollision];

    // 4. Fall back to section droppables (empty area / no widget under pointer)
    if (rectCollisions.length > 0) return [rectCollisions[0]];

    // 5. If rect intersection found nothing, use pointer position to find droppable
    const pointerSectionCollision = pointerCollisions.find(
      c => String(c.id).startsWith("section-"),
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

  const combinedClassName = `${className}${isOver ? " dashboard__section--over" : ""}`;

  return (
    <div ref={setNodeRef} className={combinedClassName} style={style}>
      {children}
    </div>
  );
}

// ─── DroppableGroupButton ──────────────────────────────────────

export function DroppableGroupButton({
  group,
  children,
  className = "",
  ...buttonProps
}: {
  group: number;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group}`,
  });

  const combinedClassName = `${className}${isOver ? " group-sidebar__item--over" : ""}`;

  return (
    <button ref={setNodeRef} className={combinedClassName} {...buttonProps}>
      {children}
    </button>
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

export function DragHandle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useSortableHandle();
  if (!ctx) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ctx.setActivatorNodeRef}
      {...ctx.listeners}
      {...ctx.attributes}
      className={`drag-handle ${className}`.trim()}
    >
      {children}
    </div>
  );
}

// ─── SortableWidgetItem ────────────────────────────────────────

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
      <div
        ref={setNodeRef}
        style={style}
        className={`drag-item drag-item--has-handle${isDragging ? " drag-item--dragging" : ""}`}
      >
        <SortableHandleContext.Provider
          value={{ setActivatorNodeRef, listeners, attributes }}
        >
          {children}
        </SortableHandleContext.Provider>
      </div>
    );
  }

  const className = `drag-item${isDragging ? " drag-item--dragging" : ""}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// ─── WidgetSortableContext ─────────────────────────────────────
// Wraps a list of widgets within a section with SortableContext

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
