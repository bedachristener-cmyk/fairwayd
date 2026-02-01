import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Sidebar() {
  const nav = useNavigate();
  const { isAuthenticated } = useAuth();

  const go = (path: string) => nav(path);

  const goProtected = (path: string) => {
    if (!isAuthenticated) {
      // no /login route yet -> send to landing
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
        background: "white",
        borderRadius: 16,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>
        Fairwayd
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => go("/map")}
          style={btnStyle}
          type="button"
          title="Open map"
        >
          🗺️ Map
        </button>

        <button
          onClick={() => goProtected("/feed")}
          style={{
            ...btnStyle,
            opacity: isAuthenticated ? 1 : 0.6,
          }}
          type="button"
          title={isAuthenticated ? "Open feed" : "Login required"}
        >
          📰 Feed
        </button>

        <button
          onClick={() => goProtected("/profile")}
          style={{
            ...btnStyle,
            opacity: isAuthenticated ? 1 : 0.6,
          }}
          type="button"
          title={isAuthenticated ? "Open profile" : "Login required"}
        >
          👤 Profile
        </button>
      </nav>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        MVP shell. Right rail + tabs are placeholders.
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  textAlign: "left",
  width: "100%",
  border: "1px solid rgba(0,0,0,0.08)",
  background: "white",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};
