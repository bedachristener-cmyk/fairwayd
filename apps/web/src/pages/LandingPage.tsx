import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LoginPanel from "../components/LoginPanel";
import DevLogin from "../components/DevLogin";
import logo from "../assets/logo.png";

export default function LandingPage() {
  const nav = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

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
        minHeight: "100vh",
        background: "#f5f6f8",
        display: "grid",
        placeItems: "center",
        padding: isAuthenticated ? 16 : 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isAuthenticated ? 1200 : 760,
          display: "grid",
          gridTemplateColumns: isAuthenticated ? "1.2fr 1fr" : "1fr",
          gap: isAuthenticated ? 16 : 24,
          alignItems: "start",
        }}
      >
        {/* Left: marketing / entry */}
        <div
          style={{
            padding: isAuthenticated ? 22 : 8,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 420,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Logo */}
            <img
              src={logo}
              alt="Fairwayd"
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
              }}
            />

            {/* Headline */}
            <div style={{ fontWeight: 900, fontSize: 28, lineHeight: 1.2 }}>
              The golf social
              <br />
              built around courses
            </div>

            {/* Subline */}
            <div style={subtitle}>
              Discover golf courses, share your rounds, and stay connected with
              your golf buddies — all in one place.
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              style={primaryBtn}
              onClick={() => nav("/map")}
              type="button"
            >
              Open map
            </button>

            <button
              style={{
                ...ghostBtn,
                opacity: isAuthenticated ? 1 : 0.6,
              }}
              onClick={() => goProtected("/feed")}
              type="button"
              title={isAuthenticated ? "Open feed" : "Login needed"}
            >
              Open feed
            </button>

            <button
              style={{
                ...ghostBtn,
                opacity: isAuthenticated ? 1 : 0.6,
              }}
              onClick={() => goProtected("/profile")}
              type="button"
              title={isAuthenticated ? "Open profile" : "Login needed"}
            >
              Profile
            </button>
          </div>

          <div style={hint}>
            Map ist frei nutzbar. Zum Posten brauchst du Login. Login ist
            rechts.
          </div>
        </div>

        {/* Right: login center */}
        <div style={{ display: "grid", gap: 16 }}>
          {!isAuthenticated ? (
            <LoginPanel />
          ) : (
            <div style={card}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                You’re logged in
              </div>

              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
                {user?.handle ? (
                  <>
                    Eingeloggt als <strong>{user.handle}</strong>. Du kannst
                    direkt in den Feed oder zu deinem Profil.
                  </>
                ) : (
                  <>Du kannst direkt in den Feed oder zu deinem Profil.</>
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  style={primaryBtn}
                  onClick={() => nav("/feed")}
                  type="button"
                >
                  Open feed
                </button>

                <button
                  style={ghostBtn}
                  onClick={() => nav("/profile")}
                  type="button"
                >
                  Profile
                </button>

                <button
                  style={ghostBtn}
                  onClick={() => nav("/map")}
                  type="button"
                >
                  Map
                </button>

                <button
                  style={dangerBtn}
                  onClick={() => {
                    logout();
                    nav("/");
                  }}
                  type="button"
                >
                  Logoff
                </button>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                (MVP) Logout ist hier auf Landing erreichbar.
              </div>
            </div>
          )}

          {/* Dev login nur zeigen, wenn bereits eingeloggt */}
          {isAuthenticated && <DevLogin />}

          {/* Optional quick links */}
          {isAuthenticated && (
            <div style={card}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                Quick links
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  style={listBtn}
                  onClick={() => nav("/map")}
                  type="button"
                >
                  🗺️ Map
                </button>

                <button
                  style={listBtn}
                  onClick={() => nav("/feed")}
                  type="button"
                >
                  📰 Feed
                </button>

                <button
                  style={listBtn}
                  onClick={() => nav("/profile")}
                  type="button"
                >
                  👤 Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: 1.2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* --- styles --- */

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
  padding: 22,
};

const subtitle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  opacity: 0.8,
  lineHeight: 1.4,
};

const hint: React.CSSProperties = {
  marginTop: 14,
  fontSize: 12,
  opacity: 0.7,
};

const primaryBtn: React.CSSProperties = {
  border: 0,
  background: "#111",
  color: "white",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  color: "#111",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  border: "1px solid rgba(227, 51, 51, 0.35)",
  background: "white",
  color: "#e33",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
};

const listBtn: React.CSSProperties = {
  textAlign: "left",
  width: "100%",
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  padding: "12px 12px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};
