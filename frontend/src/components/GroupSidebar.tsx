import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
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
    <Nav role="tablist" aria-label="Widget groups">
      {hasGroups &&
        occupiedGroups.map(g => {
          const isActive = g === activeGroup;
          const hasContent = sortedSections.some(s => s.group === g);
          return (
            <DraggableGroupButton
              key={g}
              group={g}
              $active={isActive}
              $hasContent={hasContent}
              role="tab"
              aria-selected={isActive}
              onClick={() => onGroupChange(g)}
            >
              {g}
            </DraggableGroupButton>
          );
        })}
      <SettingsLink
        to="/settings"
        aria-label="Settings"
      >
        ⚙
      </SettingsLink>
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-shrink: 0;

  @media (orientation: landscape) and (max-height: 500px) {
    flex-direction: column;
    justify-content: flex-start;
    gap: 3px;
    padding: 2px 2px 2px calc(2px + env(safe-area-inset-left, 0px));
    width: 52px;
  }

  @media (orientation: landscape) and (max-height: 400px) {
    flex-direction: column;
    justify-content: flex-start;
    gap: 2px;
    padding: 2px 2px 2px calc(2px + env(safe-area-inset-left, 0px));
    width: 42px;
  }

  @media (orientation: portrait) and (max-width: 480px) {
    order: 1;
  }
`;

const itemStyles = css`
  flex: 1;
  min-width: 35px;
  min-height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const SettingsLink = styled(Link)`
  ${itemStyles}
`;
