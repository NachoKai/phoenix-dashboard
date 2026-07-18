import { useMemo } from "react";
import type { DashboardState } from "../types";
import { computeGrid } from "../utils/grid";

export function useDashboardDerivedState(
  state: DashboardState | null,
  activeGroup: number,
) {
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

  return {
    sortedSections,
    hasGroups,
    occupiedGroups,
    visibleSections,
    gridPlacements,
    totalRows,
  };
}
