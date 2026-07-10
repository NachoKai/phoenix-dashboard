import { useCallback, useRef, useState } from 'react';

export interface DragReorderState {
  dragIndex: number | null;
  overIndex: number | null;
}

/**
 * Hook for drag-and-drop reordering within a horizontal flex container.
 * Supports both mouse drag and touch drag.
 *
 * Returns props to spread on each draggable item and a container ref.
 */
export function useDragReorder<T>(
  items: T[],
  onReorder: (reordered: T[]) => void,
) {
  const [state, setState] = useState<DragReorderState>({
    dragIndex: null,
    overIndex: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDragEl = useRef<HTMLElement | null>(null);
  const touchClone = useRef<HTMLElement | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onReorder(updated);
    },
    [items, onReorder],
  );

  // ---- Mouse / pointer drag ----

  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      setState({ dragIndex: index, overIndex: null });
    },
    [],
  );

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setState((s) => ({ ...s, overIndex: index }));
    },
    [],
  );

  const handleDrop = useCallback(
    (index: number) => (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData('text/plain'));
      if (!Number.isNaN(fromIndex)) {
        reorder(fromIndex, index);
      }
      setState({ dragIndex: null, overIndex: null });
    },
    [reorder],
  );

  const handleDragEnd = useCallback(() => {
    setState({ dragIndex: null, overIndex: null });
  }, []);

  // ---- Touch drag ----

  const getIndexFromPoint = useCallback((x: number, y: number): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const children = Array.from(container.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return i;
      }
    }
    return null;
  }, []);

  const handleTouchStart = useCallback(
    (index: number) => (e: React.TouchEvent<HTMLElement>) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      dragIndexRef.current = index;
      touchDragEl.current = e.currentTarget;

      // Create a ghost clone
      const clone = e.currentTarget.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.top = `${e.currentTarget.getBoundingClientRect().top}px`;
      clone.style.left = `${touch.clientX - 40}px`;
      clone.style.width = `${e.currentTarget.offsetWidth}px`;
      clone.style.height = `${e.currentTarget.offsetHeight}px`;
      clone.style.opacity = '0.8';
      clone.style.zIndex = '1000';
      clone.style.pointerEvents = 'none';
      clone.style.transition = 'none';
      clone.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
      clone.style.borderRadius = '14px';
      document.body.appendChild(clone);
      touchClone.current = clone;

      e.currentTarget.style.opacity = '0.3';
      setState({ dragIndex: index, overIndex: null });
    },
    [],
  );

  const handleTouchMove = useCallback(
    () => (e: React.TouchEvent<HTMLElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const clone = touchClone.current;
      if (clone) {
        clone.style.left = `${touch.clientX - 40}px`;
      }
      const idx = getIndexFromPoint(touch.clientX, touch.clientY);
      if (idx !== null) {
        setState((s) => ({ ...s, overIndex: idx }));
      }
    },
    [getIndexFromPoint],
  );

  const handleTouchEnd = useCallback(
    () => () => {
      const from = dragIndexRef.current;
      const clone = touchClone.current;
      const dragEl = touchDragEl.current;

      if (clone) {
        clone.remove();
        touchClone.current = null;
      }
      if (dragEl) {
        dragEl.style.opacity = '';
        touchDragEl.current = null;
      }

      setState((s) => {
        if (from !== null && s.overIndex !== null) {
          reorder(from, s.overIndex);
        }
        return { dragIndex: null, overIndex: null };
      });
      dragIndexRef.current = null;
    },
    [reorder],
  );

  // ---- Public API ----

  const getItemProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: handleDragStart(index),
      onDragOver: handleDragOver(index),
      onDrop: handleDrop(index),
      onDragEnd: handleDragEnd,
      onTouchStart: handleTouchStart(index),
      onTouchMove: handleTouchMove(),
      onTouchEnd: handleTouchEnd(),
      className:
        state.dragIndex === index
          ? 'drag-item drag-item--dragging'
          : state.overIndex === index
            ? 'drag-item drag-item--over'
            : 'drag-item',
    }),
    [
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      state.dragIndex,
      state.overIndex,
    ],
  );

  return { containerRef, getItemProps, isDragging: state.dragIndex !== null };
}
