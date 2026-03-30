import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Sidebar() {
  const nav = useNavigate();
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
        <button onClick={() => go("/map")} style={btnStyle} type="button">
          🗺️ Map
        </button>

        <button
          onClick={() => goProtected("/feed")}
          style={{
            ...btnStyle,
            opacity: isAuthenticated ? 1 : 0.5,
          }}
          type="button"
        >
          📰 Feed
        </button>

        <button
          onClick={() => goProtected("/profile")}
          style={{
            ...btnStyle,
            opacity: isAuthenticated ? 1 : 0.5,
          }}
          type="button"
        >
          👤 Profile
        </button>
      </nav>

      <div style={{ marginTop: 20, fontSize: 12, color: "var(--sub)" }}>
        Golf social. Simple & fast.
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  textAlign: "left",
  width: "100%",
  border: "1px solid var(--border)",
  background: "var(--muted)",
  padding: "12px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
  color: "var(--text)",
};
