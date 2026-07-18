import { Link } from "react-router-dom";

export function SleepOverlay() {
  return (
    <>
      <div className="sleep-overlay" />
      <nav className="group-sidebar group-sidebar--sleep" aria-label="Sleep settings">
        <Link
          to="/settings"
          className="group-sidebar__item group-sidebar__settings"
          aria-label="Settings"
        >
          ⚙
        </Link>
      </nav>
    </>
  );
}
