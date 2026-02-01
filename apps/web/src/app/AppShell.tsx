import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

function NavItem({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to;

  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "10px 12px",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        fontWeight: 800,
        background: active ? "rgba(0,0,0,.06)" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export default function AppShell({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
      }}
    >
      {/* Topbar (klein, optional) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(246,247,249,.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Fairwayd</div>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
            dev
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 12,
          display: "grid",
          gridTemplateColumns: "260px 1fr 320px",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            position: "sticky",
            top: 56,
            alignSelf: "start",
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,.06)",
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Menu</div>

          <div style={{ display: "grid", gap: 6 }}>
            <NavItem to="/feed" label="Feed" />
            <NavItem to="/map" label="Map" />
            <NavItem to="/profile" label="Profile" />
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            Später: Friends, Notifications, Settings
          </div>
        </aside>

        {/* Main */}
        <main
          style={{
            minHeight: 400,
            background: "transparent",
          }}
        >
          {children}
        </main>

        {/* Right */}
        <aside
          style={{
            position: "sticky",
            top: 56,
            alignSelf: "start",
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,.06)",
            padding: 12,
            minHeight: 120,
          }}
        >
          {right ?? (
            <>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Context</div>
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.35 }}>
                Hier kommt später z.B.:
                <ul style={{ margin: "8px 0 0 18px" }}>
                  <li>Selected course card</li>
                  <li>Who’s playing</li>
                  <li>Trending posts</li>
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Responsive: Sidebar/Right ausblenden */}
      <style>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns: 260px 1fr 320px"] {
            grid-template-columns: 1fr;
          }
          aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}
