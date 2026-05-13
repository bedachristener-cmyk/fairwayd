import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";
import { API_BASE } from "../api/base";

const POST_LOGIN_NEXT_KEY = "fairwayd_post_login_next";

export default function LoginPanel() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();

  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
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
    const next = new URLSearchParams(loc.search).get("next");
    nav(next && next.startsWith("/") ? next : "/feed");
  };

  const requestEmailLogin = async () => {
    const value = email.trim();
    if (!value || emailBusy) return;

    try {
      setEmailBusy(true);
      setMsg(null);
      setEmailSuccess(false);
      const next = new URLSearchParams(loc.search).get("next");
      if (next && next.startsWith("/")) {
        localStorage.setItem(POST_LOGIN_NEXT_KEY, next);
      }

      const res = await fetch(`${API_BASE}/auth/email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });

      if (!res.ok) {
        throw new Error("Email login request failed");
      }

      setEmailSuccess(true);
    } catch {
      setMsg("Could not send login link. Please try again.");
    } finally {
      setEmailBusy(false);
    }
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

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(0,0,0,0.10)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: "#111" }}>
          Continue with email
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailSuccess(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void requestEmailLogin();
          }}
          placeholder="you@example.com"
          autoComplete="email"
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid rgba(0,0,0,0.14)",
            borderRadius: 12,
            padding: "11px 12px",
            font: "inherit",
            color: "#111",
            background: "white",
          }}
        />

        <button
          type="button"
          disabled={emailBusy || !email.trim()}
          onClick={requestEmailLogin}
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#111",
            color: "white",
            opacity: emailBusy || !email.trim() ? 0.6 : 1,
            cursor: emailBusy || !email.trim() ? "default" : "pointer",
            fontWeight: 900,
          }}
        >
          {emailBusy ? "Sending..." : "Send login link"}
        </button>

        {emailSuccess ? (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(0,0,0,0.04)",
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
              fontWeight: 800,
              color: "#111",
              lineHeight: 1.35,
            }}
          >
            Check your email for a login link
          </div>
        ) : null}
      </div>
    </div>
  );
}
