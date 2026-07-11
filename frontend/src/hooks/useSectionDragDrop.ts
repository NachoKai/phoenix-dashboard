import { useCallback, useRef, useState } from "react";
import type { DashboardSection, WidgetInstance } from "../types";

export interface SectionDragState {
  dragWidgetId: string | null;
  dragFromSection: string | null;
  overSection: string | null;
  overIndex: number | null;
  overGroup: number | null;
}

function getInsertionIndex(grid: HTMLElement, x: number, y: number): number {
  const children = Array.from(grid.children) as HTMLElement[];
  for (let i = 0; i < children.length; i++) {
    const rect = children[i].getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    if (y < midY || (y === midY && x < midX)) {
      return i;
    }
  }
  return children.length;
}

/**
 * Cross-section drag-and-drop hook.
 * Supports mouse (HTML5 DnD) and touch drag with ghost clone.
 * Also supports dropping widgets onto group buttons to change section group.
 */
export function useSectionDragDrop(
  sections: DashboardSection[],
  widgets: WidgetInstance[],
  onReorder: (widgets: WidgetInstance[]) => void,
  onSectionGroupChange?: (sectionId: string, group: number) => void,
) {
  const [state, setState] = useState<SectionDragState>({
    dragWidgetId: null,
    dragFromSection: null,
    overSection: null,
    overIndex: null,
    overGroup: null,
  });

  const sectionGridsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchCloneRef = useRef<HTMLElement | null>(null);
  const touchDragElRef = useRef<HTMLElement | null>(null);
  const dragDataRef = useRef<{ widgetId: string; sectionId: string } | null>(null);
  const groupButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const overGroupRef = useRef<number | null>(null);

  const registerGrid = useCallback((sectionId: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionGridsRef.current.set(sectionId, el);
    } else {
      sectionGridsRef.current.delete(sectionId);
    }
  }, []);

  const findTargetSection = useCallback((x: number, y: number): string | null => {
    for (const [sectionId, grid] of sectionGridsRef.current.entries()) {
      const rect = grid.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return sectionId;
      }
    }
    return null;
  }, []);

  const registerGroupButton = useCallback(
    (group: number, el: HTMLButtonElement | null) => {
      if (el) {
        groupButtonsRef.current.set(group, el);
      } else {
        groupButtonsRef.current.delete(group);
      }
    },
    [],
  );

  const findTargetGroup = useCallback((x: number, y: number): number | null => {
    for (const [group, btn] of groupButtonsRef.current.entries()) {
      const rect = btn.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return group;
      }
    }
    return null;
  }, []);

  const moveWidget = useCallback(
    (widgetId: string, toSection: string, toIndex: number) => {
      const widget = widgets.find(w => w.id === widgetId);
      if (!widget) return;

      const fromSection = widget.section;
      const fromWidgets = widgets.filter(
        w => w.section === fromSection && w.id !== widgetId,
      );
      const toWidgets =
        fromSection === toSection
          ? fromWidgets
          : widgets.filter(w => w.section === toSection);

      const insertAt = Math.min(toIndex, toWidgets.length);
      const updatedTo = [...toWidgets];
      updatedTo.splice(insertAt, 0, { ...widget, section: toSection });

      const reindexedTo = updatedTo.map((w, i) => ({ ...w, position: i }));

      if (fromSection === toSection) {
        const others = widgets.filter(w => w.section !== fromSection);
        const reordered = [...others, ...reindexedTo].sort((a, b) => {
          if (a.section !== b.section) {
            const sA = sections.find(s => s.id === a.section);
            const sB = sections.find(s => s.id === b.section);
            return (sA?.position ?? 0) - (sB?.position ?? 0);
          }
          return a.position - b.position;
        });
        onReorder(reordered);
      } else {
        const reindexedFrom = fromWidgets.map((w, i) => ({ ...w, position: i }));
        const others = widgets.filter(
          w => w.section !== fromSection && w.section !== toSection,
        );
        const reordered = [...others, ...reindexedFrom, ...reindexedTo].sort((a, b) => {
          if (a.section !== b.section) {
            const sA = sections.find(s => s.id === a.section);
            const sB = sections.find(s => s.id === b.section);
            return (sA?.position ?? 0) - (sB?.position ?? 0);
          }
          return a.position - b.position;
        });
        onReorder(reordered);
      }
    },
    [widgets, sections, onReorder],
  );

  // ── Mouse / Pointer drag ──

  const handleDragStart = useCallback(
    (widgetId: string, sectionId: string) => (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", widgetId);
      dragDataRef.current = { widgetId, sectionId };
      setState({
        dragWidgetId: widgetId,
        dragFromSection: sectionId,
        overSection: null,
        overIndex: null,
        overGroup: null,
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (sectionId: string) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const grid = sectionGridsRef.current.get(sectionId);
      if (!grid) return;
      const idx = getInsertionIndex(grid, e.clientX, e.clientY);
      setState(s => ({ ...s, overSection: sectionId, overIndex: idx }));
    },
    [],
  );

  const handleDrop = useCallback(
    (sectionId: string) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const data = dragDataRef.current;
      if (!data) return;
      const grid = sectionGridsRef.current.get(sectionId);
      const idx = grid ? getInsertionIndex(grid, e.clientX, e.clientY) : 0;
      moveWidget(data.widgetId, sectionId, idx);
      setState({
        dragWidgetId: null,
        dragFromSection: null,
        overSection: null,
        overIndex: null,
        overGroup: null,
      });
      dragDataRef.current = null;
    },
    [moveWidget],
  );

  const handleDragEnd = useCallback(() => {
    setState({
      dragWidgetId: null,
      dragFromSection: null,
      overSection: null,
      overIndex: null,
      overGroup: null,
    });
    dragDataRef.current = null;
  }, []);

  // ── Group button drop targets ──

  const handleGroupDragOver = useCallback(
    (group: number) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setState(s => ({ ...s, overGroup: group }));
    },
    [],
  );

  const handleGroupDragLeave = useCallback(
    (group: number) => (e: React.DragEvent<HTMLElement>) => {
      const btn = groupButtonsRef.current.get(group);
      if (btn && e.relatedTarget && btn.contains(e.relatedTarget as Node)) return;
      setState(s => ({ ...s, overGroup: null }));
    },
    [],
  );

  const handleGroupDrop = useCallback(
    (group: number) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const data = dragDataRef.current;
      if (!data || !onSectionGroupChange) return;
      const widget = widgets.find(w => w.id === data.widgetId);
      if (widget) {
        const sectionId = widget.section;
        onSectionGroupChange(sectionId, group);
      }
      setState({
        dragWidgetId: null,
        dragFromSection: null,
        overSection: null,
        overIndex: null,
        overGroup: null,
      });
      dragDataRef.current = null;
    },
    [widgets, onSectionGroupChange],
  );

  // ── Touch drag ──

  const handleTouchStart = useCallback(
    (widgetId: string, sectionId: string) => (e: React.TouchEvent<HTMLElement>) => {
      const touch = e.touches[0];
      const el = e.currentTarget;
      dragDataRef.current = { widgetId, sectionId };

      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = `${el.getBoundingClientRect().top}px`;
      clone.style.left = `${touch.clientX - el.offsetWidth / 2}px`;
      clone.style.width = `${el.offsetWidth}px`;
      clone.style.height = `${el.offsetHeight}px`;
      clone.style.opacity = "0.85";
      clone.style.zIndex = "1000";
      clone.style.pointerEvents = "none";
      clone.style.transition = "none";
      clone.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
      clone.style.borderRadius = "14px";
      clone.style.transform = "scale(1.03)";
      document.body.appendChild(clone);
      touchCloneRef.current = clone;

      el.style.opacity = "0.25";
      el.style.transform = "scale(0.96)";
      touchDragElRef.current = el;

      setState({
        dragWidgetId: widgetId,
        dragFromSection: sectionId,
        overSection: null,
        overIndex: null,
        overGroup: null,
      });
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const clone = touchCloneRef.current;
      if (clone) {
        const el = touchDragElRef.current;
        const w = el ? el.offsetWidth : 120;
        clone.style.left = `${touch.clientX - w / 2}px`;
        clone.style.top = `${touch.clientY - 30}px`;
      }

      const targetGroup = findTargetGroup(touch.clientX, touch.clientY);
      if (targetGroup !== null) {
        overGroupRef.current = targetGroup;
        setState(s => ({
          ...s,
          overGroup: targetGroup,
          overSection: null,
          overIndex: null,
        }));
        return;
      }
      overGroupRef.current = null;

      const targetSection = findTargetSection(touch.clientX, touch.clientY);
      if (targetSection) {
        const grid = sectionGridsRef.current.get(targetSection);
        const idx = grid ? getInsertionIndex(grid, touch.clientX, touch.clientY) : 0;
        setState(s => ({
          ...s,
          overSection: targetSection,
          overIndex: idx,
          overGroup: null,
        }));
      } else {
        setState(s => ({ ...s, overSection: null, overIndex: null, overGroup: null }));
      }
    },
    [findTargetSection, findTargetGroup],
  );

  const handleTouchEnd = useCallback(
    (_e?: React.TouchEvent<HTMLElement>) => {
      const data = dragDataRef.current;
      const clone = touchCloneRef.current;
      const dragEl = touchDragElRef.current;

      if (clone) {
        clone.remove();
        touchCloneRef.current = null;
      }
      if (dragEl) {
        dragEl.style.opacity = "";
        dragEl.style.transform = "";
        touchDragElRef.current = null;
      }

      const droppedGroup = overGroupRef.current;

      setState(s => {
        if (data && droppedGroup !== null && onSectionGroupChange) {
          const widget = widgets.find(w => w.id === data.widgetId);
          if (widget) {
            onSectionGroupChange(widget.section, droppedGroup);
          }
        } else if (data && s.overSection !== null) {
          const grid = sectionGridsRef.current.get(s.overSection);
          const idx = grid && s.overIndex !== null ? s.overIndex : 0;
          moveWidget(data.widgetId, s.overSection, idx);
        }
        return {
          dragWidgetId: null,
          dragFromSection: null,
          overSection: null,
          overIndex: null,
          overGroup: null,
        };
      });
      dragDataRef.current = null;
      overGroupRef.current = null;
    },
    [moveWidget, widgets, onSectionGroupChange],
  );

  const handleTouchCancel = useCallback(() => {
    const clone = touchCloneRef.current;
    const dragEl = touchDragElRef.current;

    if (clone) {
      clone.remove();
      touchCloneRef.current = null;
    }
    if (dragEl) {
      dragEl.style.opacity = "";
      dragEl.style.transform = "";
      touchDragElRef.current = null;
    }

    setState({
      dragWidgetId: null,
      dragFromSection: null,
      overSection: null,
      overIndex: null,
      overGroup: null,
    });
    dragDataRef.current = null;
    overGroupRef.current = null;
  }, []);

  // ── Public API ──

  const getSectionProps = useCallback(
    (sectionId: string) => ({
      onDragOver: handleDragOver(sectionId),
      onDrop: handleDrop(sectionId),
      isOver: state.overSection === sectionId && state.dragWidgetId !== null,
    }),
    [handleDragOver, handleDrop, state.overSection, state.dragWidgetId],
  );

  const getGridRef = useCallback(
    (sectionId: string) => (el: HTMLDivElement | null) => {
      registerGrid(sectionId, el);
    },
    [registerGrid],
  );

  const getWidgetProps = useCallback(
    (widgetId: string, sectionId: string) => {
      const isDragging = state.dragWidgetId === widgetId;
      const sectionWidgets = widgets.filter(w => w.section === sectionId);
      const widgetIndex = sectionWidgets.findIndex(w => w.id === widgetId);

      let className = "drag-item";
      if (isDragging) {
        className += " drag-item--dragging";
      } else if (
        state.overSection === sectionId &&
        state.overIndex !== null &&
        state.dragWidgetId !== null
      ) {
        if (state.overIndex === widgetIndex || state.overIndex === widgetIndex + 1) {
          className += " drag-item--over";
        }
      }

      return {
        draggable: true,
        onDragStart: handleDragStart(widgetId, sectionId),
        onDragEnd: handleDragEnd,
        onTouchStart: handleTouchStart(widgetId, sectionId),
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
        className,
      };
    },
    [
      state,
      widgets,
      handleDragStart,
      handleDragEnd,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleTouchCancel,
    ],
  );

  const getGroupButtonProps = useCallback(
    (group: number) => ({
      onDragOver: handleGroupDragOver(group),
      onDragLeave: handleGroupDragLeave(group),
      onDrop: handleGroupDrop(group),
      ref: (el: HTMLButtonElement | null) => registerGroupButton(group, el),
      isOver: state.overGroup === group && state.dragWidgetId !== null,
    }),
    [
      handleGroupDragOver,
      handleGroupDragLeave,
      handleGroupDrop,
      registerGroupButton,
      state.overGroup,
      state.dragWidgetId,
    ],
  );

  return {
    getSectionProps,
    getGridRef,
    getWidgetProps,
    getGroupButtonProps,
    isDragging: state.dragWidgetId !== null,
  };
}
