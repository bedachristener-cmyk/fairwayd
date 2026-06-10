import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";
import { API_BASE } from "../api/base";
import { validPostLoginNext } from "../auth/postLoginNext";

export default function LoginPanel() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);
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
    const next = validPostLoginNext(new URLSearchParams(loc.search).get("next"));
    nav(next ?? "/feed", { replace: true });
  };

  const readApiError = async (res: Response, fallback: string) => {
    const text = await res.text().catch(() => "");
    let message = "";

    if (text) {
      try {
        const data = JSON.parse(text);
        message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : text;
      } catch {
        message = text;
      }
    }

    return message
      ? `${fallback}: ${message} (${res.status})`
      : `${fallback} (${res.status})`;
  };

  const passwordLogin = async () => {
    const value = email.trim();
    if (!value || !password || passwordBusy) return;

    try {
      setPasswordBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/password-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, password }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Invalid email or password"));
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error("Invalid email or password");
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        err instanceof Error
          ? err.message
          : "Invalid email or password",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  const registerAccount = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (registerBusy) return;

    if (!cleanName) {
      setMsg("Name is required");
      return;
    }
    if (!cleanEmail) {
      setMsg("Email is required");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters");
      return;
    }
    if (password !== passwordConfirm) {
      setMsg("Passwords do not match");
      return;
    }

    try {
      setRegisterBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          passwordConfirm,
        }),
      });

      if (!res.ok) {
        const apiError = await readApiError(res, "Could not create account");

        if (res.status === 409 || /already registered/i.test(apiError)) {
          throw new Error(
            "This email is already registered. Please sign in instead.",
          );
        }

        throw new Error(apiError);
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error("Could not create account");
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        err instanceof Error
          ? err.message
          : "Could not create account",
      );
    } finally {
      setRegisterBusy(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(0,0,0,0.14)",
    borderRadius: 12,
    padding: "11px 12px",
    font: "inherit",
    color: "#111",
    background: "white",
  };

  const primaryButtonStyle: CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "#111",
    color: "white",
    fontWeight: 900,
  };

  const linkButtonStyle: CSSProperties = {
    border: 0,
    background: "transparent",
    color: "#111",
    font: "inherit",
    fontSize: 13,
    fontWeight: 900,
    padding: "8px 0",
    cursor: "pointer",
    textDecoration: "underline",
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
        build {import.meta.env.MODE} / {window.location.origin} / api {API_BASE}
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

      {mode === "signin" ? (
        <>
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: "#111" }}>
              Sign in with email
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void passwordLogin();
              }}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void passwordLogin();
              }}
              placeholder="Password"
              autoComplete="current-password"
              style={inputStyle}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
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

            <button
              type="button"
              disabled={passwordBusy || !email.trim() || !password}
              onClick={passwordLogin}
              style={{
                ...primaryButtonStyle,
                opacity: passwordBusy || !email.trim() || !password ? 0.6 : 1,
                cursor:
                  passwordBusy || !email.trim() || !password
                    ? "default"
                    : "pointer",
              }}
            >
              {passwordBusy ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 12,
              margin: "16px 0",
              color: "rgba(0,0,0,0.52)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <div style={{ height: 1, background: "rgba(0,0,0,0.10)" }} />
            <div>or</div>
            <div style={{ height: 1, background: "rgba(0,0,0,0.10)" }} />
          </div>

          {googleConfigured ? (
            <GoogleLoginButton
              onToken={(token: string) => onLoggedIn(token)}
              onError={(m: string) => setMsg(m || null)}
            />
          ) : (
            <>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                Google Login ist nicht konfiguriert.
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Setze <strong>VITE_GOOGLE_CLIENT_ID</strong> im Web (Vercel /
                .env), dann erscheint der Google Button.
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMsg(null);
            }}
            style={{ ...linkButtonStyle, marginTop: 10 }}
          >
            Create account
          </button>
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#111" }}>
            Register account
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="name"
            style={inputStyle}
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void registerAccount();
            }}
            placeholder="Repeat password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <button
            type="button"
            disabled={registerBusy}
            onClick={registerAccount}
            style={{
              ...primaryButtonStyle,
              opacity: registerBusy ? 0.6 : 1,
              cursor: registerBusy ? "default" : "pointer",
            }}
          >
            {registerBusy ? "Creating account..." : "Register account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg(null);
            }}
            style={linkButtonStyle}
          >
            Already have an account? Sign in
          </button>
        </div>
      )}
    </div>
  );
}
