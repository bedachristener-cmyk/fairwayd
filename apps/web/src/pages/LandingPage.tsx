import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LoginPanel from "../components/LoginPanel";
import DevLogin from "../components/DevLogin";
import logo from "../assets/logo.png";

export default function LandingPage() {
  const nav = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const loginPanelRef = useRef<HTMLDivElement | null>(null);
  const [highlightLogin, setHighlightLogin] = useState(false);

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

            {/* Brand name */}
            <div
              style={{ fontWeight: 900, fontSize: 18, color: "var(--text)" }}
            >
              Fairwayd
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 12,
                color: "var(--green)",
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              Discover golf through courses, players, and stories
            </div>

            {/* Headline */}
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.2,
                color: "var(--text)",
              }}
            >
              Everything about golf
              <br />
              in one place
            </div>

            {/* Subline */}
            <div style={subtitle}>
              Find courses, share your rounds, rate experiences, follow other
              golfers, and stay connected wherever you play.
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
              Explore courses
            </button>

            {!isAuthenticated && (
              <button
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={() => {
                  loginPanelRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  setHighlightLogin(true);
                  window.setTimeout(() => setHighlightLogin(false), 1200);
                }}
                type="button"
              >
                Sign in
              </button>
            )}

            {isAuthenticated && (
              <button
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={() => nav("/feed")}
                type="button"
              >
                Feed
              </button>
            )}

            {isAuthenticated && (
              <button
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                onClick={() => nav("/profile")}
                type="button"
              >
                Profile
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "var(--sub)",
              lineHeight: 1.5,
            }}
          ></div>

          <div style={hint}>
            Explore the map freely. Sign in to post, review courses, and join
            the conversation.
          </div>
        </div>

        {/* Right: login / entry panel */}
        <div style={{ display: "grid", gap: 16 }}>
          {!isAuthenticated ? (
            <div
              style={{
                ...card,
                background:
                  "linear-gradient(180deg, var(--card) 0%, rgba(255,255,255,0.96) 100%)",
                border: "1px solid var(--border)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 14,
                }}
              >
                Welcome to Fairwayd
              </div>

              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.15,
                  fontWeight: 900,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                Join the golf community
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--sub)",
                  marginBottom: 18,
                }}
              >
                Sign in to post updates, rate courses, ask questions, and follow
                what other golfers are sharing.
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <div style={featureRow}>
                  <span>⛳</span>
                  <span>Share rounds and golf moments</span>
                </div>
                <div style={featureRow}>
                  <span>🗺️</span>
                  <span>Discover courses on the map</span>
                </div>
                <div style={featureRow}>
                  <span>💬</span>
                  <span>Join reviews, comments, and discussion</span>
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid var(--border)",
                }}
              >
                <div ref={loginPanelRef}>
                  <div
                    ref={loginPanelRef}
                    style={{
                      borderRadius: 22,
                      transition: "box-shadow 0.25s ease, transform 0.25s ease",
                      boxShadow: highlightLogin
                        ? "0 0 0 4px rgba(34, 197, 94, 0.18), 0 18px 40px rgba(0,0,0,0.12)"
                        : "none",
                      transform: highlightLogin ? "translateY(-2px)" : "none",
                    }}
                  >
                    <LoginPanel />
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.5,
                }}
              >
                You can browse first and sign in when you are ready.
              </div>
            </div>
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
  color: "var(--sub)",
  lineHeight: 1.5,
};

const hint: React.CSSProperties = {
  marginTop: 14,
  fontSize: 12,
  opacity: 0.7,
};

const featureRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  color: "var(--text)",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(0,0,0,0.02)",
  border: "1px solid var(--border)",
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
