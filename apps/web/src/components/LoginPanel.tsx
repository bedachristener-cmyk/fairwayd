import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";

export default function LoginPanel() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [msg, setMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const googleConfigured = useMemo(() => {
    // Vite ersetzt das zur Build-Zeit; wenn es fehlt, ist Google Login nicht konfiguriert
    return !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }, []);

  useEffect(() => {
    const savedRemember = localStorage.getItem("fairwayd_remember_me");
    if (savedRemember != null) setRememberMe(savedRemember === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("fairwayd_remember_me", rememberMe ? "1" : "0");
  }, [rememberMe]);

  const onLoggedIn = (token: string) => {
    setMsg(null);
    login(token, rememberMe);
    nav("/feed");
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
        build {import.meta.env.MODE} / {window.location.origin}
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,0,0,0.06)",
            border: "1px solid rgba(255,0,0,0.18)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      {/* Remember me */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          opacity: 0.85,
        }}
      >
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <span style={{ fontSize: 12 }}>
          Angemeldet bleiben (auf fremden PCs deaktivieren)
        </span>
      </label>

      {googleConfigured ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <GoogleLoginButton
              onToken={(token: string) => onLoggedIn(token)}
              onError={(m: string) => setMsg(m || null)}
            />
          </div>

          <button
            type="button"
            disabled
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "rgba(0,0,0,0.06)",
              opacity: 0.7,
              cursor: "not-allowed",
              fontWeight: 800,
            }}
          >
            Continue with Email (soon)
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Google Login ist aktiv. Email Login kommt als Fallback.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Google Login ist nicht konfiguriert.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Setze <strong>VITE_GOOGLE_CLIENT_ID</strong> im Web (Vercel / .env),
            dann erscheint der Google Button.
          </div>
        </>
      )}
    </div>
  );
}
