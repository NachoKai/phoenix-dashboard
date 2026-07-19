import { Link } from "react-router-dom";
import styled from "styled-components";

export function SleepOverlay() {
  return (
    <>
      <Overlay />
      <Nav aria-label="Sleep settings">
        <SettingsLink to="/settings" aria-label="Settings">
          ⚙
        </SettingsLink>
      </Nav>
    </>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 5;
`;

const Nav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-shrink: 0;
`;

const SettingsLink = styled(Link)`
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
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  text-decoration: none;

  &:hover {
    color: #fff;
  }
`;
