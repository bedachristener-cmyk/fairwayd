import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import RightRail from "./RightRail";
import BottomTabs from "./BottomTabs";

export default function AppShell() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8" }}>
      {/* Desktop layout */}
      <div
        className="fw-shell-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr) 320px",
          gap: 16,
          maxWidth: 1280,
          margin: "0 auto",
          padding: 16,
        }}
      >
        <div className="fw-desktop-only">
          <Sidebar />
        </div>

        <main
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
            minHeight: "calc(100vh - 32px)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>

        <div className="fw-desktop-only">
          <RightRail />

          {/* ✅ Portal slot for FeedPage minimap */}
          <div id="right-rail-slot" style={{ marginTop: 12 }} />
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <div className="fw-mobile-only">
        <BottomTabs />
      </div>

      {/* Simple responsive helpers */}
      <style>{`
        .fw-desktop-only { display: block; }
        .fw-mobile-only { display: none; }

        @media (max-width: 980px) {
          .fw-desktop-only { display: none; }
          .fw-mobile-only { display: block; }
          .fw-shell-grid {
            display: block !important;
            padding: 12px !important;
          }
          main {
            min-height: auto !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
