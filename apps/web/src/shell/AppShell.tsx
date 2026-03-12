import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import RightRail from "./RightRail";
import BottomTabs from "./BottomTabs";
import TopRail from "./TopRail";

export default function AppShell() {
  return (
    <div className="fw-shell">
      {/* Top rail */}
      <TopRail />

      {/* Desktop layout */}
      <div className="fw-shell-grid">
        <div className="fw-desktop-only">
          <Sidebar />
        </div>

        <main className="fw-shell-main">
          <div className="fw-outlet">
            <Outlet />
          </div>
        </main>

        <div className="fw-desktop-only">
          <RightRail />
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <div className="fw-mobile-only">
        <BottomTabs />
      </div>
    </div>
  );
}
