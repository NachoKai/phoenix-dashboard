import { Link } from "react-router-dom";
import { DraggableGroupButton } from "../hooks/useSectionDragDrop";
import type { DashboardSection } from "../types";

export function GroupSidebar({
  hasGroups,
  occupiedGroups,
  activeGroup,
  sortedSections,
  onGroupChange,
}: {
  hasGroups: boolean;
  occupiedGroups: number[];
  activeGroup: number;
  sortedSections: DashboardSection[];
  onGroupChange: (group: number) => void;
}) {
  return (
    <nav className="group-sidebar" role="tablist" aria-label="Widget groups">
      {hasGroups &&
        occupiedGroups.map(g => {
          const isActive = g === activeGroup;
          const hasContent = sortedSections.some(s => s.group === g);
          return (
            <DraggableGroupButton
              key={g}
              group={g}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`group-sidebar__item${isActive ? " group-sidebar__item--active" : ""}${hasContent ? " group-sidebar__item--has-content" : ""}`}
              onClick={() => onGroupChange(g)}
            >
              {g}
            </DraggableGroupButton>
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
  );
}
