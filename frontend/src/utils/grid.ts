import type { DashboardSection } from "../types";

export interface GridPlacement {
  section: DashboardSection;
  gridColumn: string;
  gridRow: string;
}

export interface GridResult {
  placements: GridPlacement[];
  totalRows: number;
}

export function computeGrid(sections: DashboardSection[]): GridResult {
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
