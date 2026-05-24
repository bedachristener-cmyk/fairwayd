import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LoginPanel from "../components/LoginPanel";
import DevLogin from "../components/DevLogin";
import logo from "../assets/logo.png";
import { validPostLoginNext } from "../auth/postLoginNext";

export default function LandingPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const loginPanelRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const [highlightLogin, setHighlightLogin] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [loginHintText, setLoginHintText] = useState("Sign in to continue");
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;

  useEffect(() => {
    if (isAuthenticated) {
      const next = validPostLoginNext(new URLSearchParams(loc.search).get("next"));
      nav(next ?? "/feed", { replace: true });
    }
  }, [isAuthenticated, loc.search, nav]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        display: "grid",
        placeItems: "center",
        padding: isMobile ? 14 : isAuthenticated ? 16 : 24,
        overflowX: "hidden",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isAuthenticated ? 1200 : 760,
          display: "grid",
          gridTemplateColumns: isAuthenticated
            ? isMobile
              ? "1fr"
              : "1.2fr 1fr"
            : "1fr",
          gap: isMobile ? 16 : isAuthenticated ? 16 : 24,
          alignItems: "start",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {/* Left: marketing / entry */}
        <div
          style={{
            padding: isMobile ? 4 : isAuthenticated ? 22 : 8,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: isMobile ? "auto" : 420,
            background: "transparent",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <img
              src={logo}
              alt="Fairwayd"
              style={{
                width: isMobile ? 52 : 64,
                height: isMobile ? 52 : 64,
                borderRadius: isMobile ? 14 : 16,
              }}
            />

            <div
              style={{
                fontWeight: 900,
                fontSize: isMobile ? 26 : 32,
                color: "#1a1a1a",
                letterSpacing: isMobile ? -0.4 : -0.6,
              }}
            >
              Fairwayd
            </div>

            <div
              style={{
                fontSize: isMobile ? 13 : 15,
                color: "#1bbf73",
                fontWeight: 800,
                letterSpacing: 0.1,
                lineHeight: 1.4,
              }}
            >
              Discover golf through courses, players, and stories
            </div>

            <div
              style={{
                fontWeight: 900,
                fontSize: isMobile ? 30 : 38,
                lineHeight: isMobile ? 1.12 : 1.08,
                color: "#111111",
                letterSpacing: isMobile ? -0.5 : -0.8,
                maxWidth: isMobile ? "100%" : 540,
              }}
            >
              Everything about golf
              <br />
              in one place
            </div>

            <div style={subtitle(isMobile)}>
              Find courses, share your rounds, rate experiences, follow other
              golfers, and stay connected wherever you play.
            </div>
          </div>

          <div
            style={{
              marginTop: isMobile ? 16 : 18,
              display: "flex",
              gap: isMobile ? 8 : 10,
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
                style={secondaryBtn}
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

            {!isAuthenticated && (
              <button
                style={secondaryBtn}
                onClick={() => {
                  aboutRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                type="button"
              >
                What is Fairwayd?
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

          <div style={hint(isMobile)}>
            Explore the map freely. Sign in to post, review courses, and join
            the conversation.
          </div>

          {!isAuthenticated && (
            <div
              style={{
                marginTop: isMobile ? 18 : 22,
                padding: isMobile ? 16 : 18,
                borderRadius: isMobile ? 18 : 20,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
                maxWidth: 620,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#1bbf73",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 10,
                }}
              >
                Popular golf destinations
              </div>

              <div
                style={{
                  fontSize: isMobile ? 20 : 22,
                  fontWeight: 900,
                  color: "#111111",
                  lineHeight: 1.15,
                  marginBottom: 10,
                }}
              >
                Explore golf in inspiring places
              </div>

              <div
                style={{
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: isMobile ? 1.65 : 1.7,
                  color: "#4b5563",
                  marginBottom: 10,
                }}
              >
                Browse destinations to discover courses, stories, and golf
                experiences from around the world.
              </div>

              {!isAuthenticated && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  Sign in to explore destinations.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <button
                  style={destinationChip}
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });

                      setHighlightLogin(true);

                      setLoginHintText("Sign in to explore destinations");
                      setShowLoginHint(true);

                      window.setTimeout(() => setHighlightLogin(false), 1200);
                      window.setTimeout(() => setShowLoginHint(false), 2400);

                      return;
                    }
                    nav("/destinations/th");
                  }}
                  type="button"
                >
                  🇹🇭 Golf in Thailand
                </button>

                <button
                  style={destinationChip}
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });

                      setHighlightLogin(true);

                      setLoginHintText("Sign in to explore destinations");
                      setShowLoginHint(true);

                      window.setTimeout(() => setHighlightLogin(false), 1200);
                      window.setTimeout(() => setShowLoginHint(false), 2400);

                      return;
                    }
                    nav("/destinations/pt");
                  }}
                  type="button"
                >
                  🇹🇭 Golf in Portugal
                </button>

                <button
                  style={destinationChip}
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });

                      setHighlightLogin(true);

                      setLoginHintText("Sign in to explore destinations");
                      setShowLoginHint(true);

                      window.setTimeout(() => setHighlightLogin(false), 1200);
                      window.setTimeout(() => setShowLoginHint(false), 2400);

                      return;
                    }
                    nav("/destinations/es");
                  }}
                  type="button"
                >
                  🇹🇭 Golf in Spain
                </button>

                <button
                  style={destinationChip}
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });

                      setHighlightLogin(true);

                      setLoginHintText("Sign in to explore destinations");
                      setShowLoginHint(true);

                      window.setTimeout(() => setHighlightLogin(false), 1200);
                      window.setTimeout(() => setShowLoginHint(false), 2400);

                      return;
                    }
                    nav("/destinations/ch");
                  }}
                  type="button"
                >
                  🇹🇭 Golf in Switzerland
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  style={secondaryBtn}
                  onClick={() => {
                    if (!isAuthenticated) {
                      loginPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });

                      setHighlightLogin(true);

                      setLoginHintText("Sign in to explore destinations");
                      setShowLoginHint(true);

                      window.setTimeout(() => setHighlightLogin(false), 1200);
                      window.setTimeout(() => setShowLoginHint(false), 2400);

                      return;
                    }
                    nav("/destinations");
                  }}
                  type="button"
                >
                  View all destinations
                </button>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div
              ref={aboutRef}
              style={{
                marginTop: isMobile ? 22 : 28,
                padding: isMobile ? 16 : 20,
                borderRadius: isMobile ? 18 : 20,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
                maxWidth: 620,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#1bbf73",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 10,
                }}
              >
                What is Fairwayd?
              </div>

              <div
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 900,
                  color: "#111111",
                  lineHeight: 1.15,
                  marginBottom: 10,
                }}
              >
                A social golf app built around real courses
              </div>

              <div
                style={{
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: isMobile ? 1.65 : 1.7,
                  color: "#4b5563",
                }}
              >
                Fairwayd is for golfers who want more than a list of courses.
                You can explore golf destinations, follow courses and players,
                share posts from where you play, and discover what other golfers
                are experiencing.
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: isMobile ? 1.65 : 1.7,
                  color: "#4b5563",
                }}
              >
                It is designed for golfers who enjoy discovering new places,
                sharing their golf life, and staying connected through courses,
                rounds, stories, and community.
              </div>
            </div>
          )}
        </div>

        {/* Right: login / entry panel */}
        <div
          style={{
            display: "grid",
            gap: 16,
            minWidth: 0,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {!isAuthenticated ? (
            <div
              style={{
                ...card,
                background: "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
                padding: isMobile ? 18 : 24,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "white",
                  marginBottom: 14,
                }}
              >
                Welcome to Fairwayd
              </div>

              <div
                style={{
                  fontSize: isMobile ? 26 : 34,
                  lineHeight: isMobile ? 1.12 : 1.08,
                  fontWeight: 900,
                  color: "white",
                  marginBottom: 10,
                  letterSpacing: isMobile ? -0.4 : -0.6,
                }}
              >
                Join the golf community
              </div>

              <div
                style={{
                  fontSize: isMobile ? 14 : 16,
                  lineHeight: isMobile ? 1.6 : 1.65,
                  color: "rgba(255,255,255,0.82)",
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
                  padding: isMobile ? 12 : 14,
                  borderRadius: 16,
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid var(--border)",
                }}
              >
                <div ref={loginPanelRef} style={{ width: "100%" }}>
                  <div
                    style={{
                      borderRadius: 22,
                      transition: "box-shadow 0.25s ease, transform 0.25s ease",
                      boxShadow: highlightLogin
                        ? "0 0 0 4px rgba(34, 197, 94, 0.18), 0 18px 40px rgba(0,0,0,0.12)"
                        : "none",
                      transform: highlightLogin ? "translateY(-2px)" : "none",
                      maxWidth: isMobile ? "100%" : 360,
                      margin: "0 auto",
                      width: "100%",
                      boxSizing: "border-box",
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

          {isAuthenticated && <DevLogin />}

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
      {showLoginHint && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? 80 : 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            color: "#111",
            padding: "12px 16px",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.08)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "90%",
          }}
        >
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>{loginHintText}</span>
        </div>
      )}

      <style>{`
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
`}</style>
    </div>
  );
}

/* --- styles --- */

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  padding: 22,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const subtitle = (isMobile: boolean): React.CSSProperties => ({
  marginTop: 8,
  fontSize: isMobile ? 15 : 17,
  color: "#4b5563",
  lineHeight: isMobile ? 1.6 : 1.7,
  maxWidth: isMobile ? "100%" : 620,
});

const hint = (isMobile: boolean): React.CSSProperties => ({
  marginTop: 16,
  fontSize: isMobile ? 12 : 13,
  color: "#6b7280",
  lineHeight: 1.6,
  maxWidth: isMobile ? "100%" : 560,
});

const featureRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  color: "white",
  padding: "12px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  minWidth: 0,
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  border: 0,
  background: "#111111",
  color: "white",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 14,
  boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  background: "white",
  color: "#111111",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 14,
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
  boxSizing: "border-box",
};

const destinationChip: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  background: "#f8fafc",
  color: "#111111",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 14,
};
