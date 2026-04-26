import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { t } from "../i18n/strings";

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { isAuthenticated } = useAuth();

  const go = (path: string) => nav(path);

  const goProtected = (path: string) => {
    if (!isAuthenticated) {
      nav("/");
      return;
    }
    nav(path);
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        alignSelf: "start",
        background: "var(--card)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 22px rgba(0,0,0,0.35)",
        padding: 16,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 20,
          marginBottom: 18,
          color: "var(--text)",
          letterSpacing: 0.5,
        }}
      >
        Fairwayd
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={() => go("/map")}
          style={btnStyle(loc.pathname.startsWith("/map"))}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(6px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
          }}
          type="button"
        >
          🗺️ {t("map")}
        </button>

        <button
          onClick={() => go("/destinations")}
          style={btnStyle(loc.pathname.startsWith("/destinations"))}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(6px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
          }}
          type="button"
        >
          🌍 {t("explore")}
        </button>

        <button
          onClick={() => goProtected("/feed")}
          style={{
            ...btnStyle(loc.pathname.startsWith("/feed")),
            opacity: isAuthenticated ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(6px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
          }}
          type="button"
        >
          📰 {t("feed")}
        </button>

        <button
          onClick={() => goProtected("/profile")}
          style={{
            ...btnStyle(loc.pathname.startsWith("/profile")),
            opacity: isAuthenticated ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(6px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
          }}
          type="button"
        >
          👤 {t("profile")}
        </button>
      </nav>
      <div style={{ marginTop: 20, fontSize: 12, color: "var(--sub)" }}>
        {t("golf_social_tagline")}
      </div>
    </div>
  );
}

const btnStyle = (active: boolean): React.CSSProperties => ({
  textAlign: "left",
  width: "100%",
  border: active ? "1px solid rgba(79,140,255,0.5)" : "1px solid var(--border)",
  background: active ? "rgba(79,140,255,0.12)" : "var(--muted)",
  padding: "12px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: active ? 800 : 700,
  color: "var(--text)",
  transition: "all 0.18s ease",
});
