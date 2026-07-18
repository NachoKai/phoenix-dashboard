import { useCallback, useEffect, useRef } from "react";
import { useUiStore } from "../stores/uiStore";
import type { DashboardState } from "../types";

export function useAutoRotate(
  state: DashboardState | null,
  occupiedGroups: number[],
  updateState: (updater: (prev: DashboardState) => DashboardState) => void,
  persistState: (state: DashboardState) => void,
  setActiveGroup: (group: number) => void,
) {
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
  }, [state, occupiedGroups, updateState, persistState, setActiveGroup]);

  useEffect(() => {
    resetRotateTimer();
    return () => {
      if (rotateTimerRef.current != null) clearInterval(rotateTimerRef.current);
    };
  }, [resetRotateTimer]);

  return resetRotateTimer;
}
