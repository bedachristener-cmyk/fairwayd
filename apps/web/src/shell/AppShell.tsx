import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import RightRail from "./RightRail";
import BottomTabs from "./BottomTabs";
import TopRail from "./TopRail";

export default function AppShell() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top rail */}
      <TopRail />

      {/* Desktop layout */}
      <div
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
            background: "var(--card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
            minHeight: "calc(100vh - 32px - 60px)", // minus padding and TopRail
            overflow: "hidden",
          }}
        >
          <Outlet />
        </main>

        <div className="fw-desktop-only">
          <RightRail />
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
          div[style*="gridTemplateColumns"] {
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
