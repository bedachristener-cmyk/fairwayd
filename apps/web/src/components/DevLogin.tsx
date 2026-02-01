import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "./GoogleLoginButton";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const STORAGE_KEY = "fairwayd_token";

// optional: show dev login only on localhost
const isDev =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname.startsWith("192.168.");

export default function LoginPanel() {
  const nav = useNavigate();
  const { loading, isAuthenticated, user, login, logout } = useAuth();

  const [handle, setHandle] = useState("beda");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedHandle = localStorage.getItem("fairwayd_handle");
    if (savedHandle) setHandle(savedHandle);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      const label = user?.handle || user?.name || "user";
      setMsg(`Logged in as ${label} ✅`);
    } else {
      setMsg(null);
    }
  }, [loading, isAuthenticated, user]);

  const doDevLogin = async () => {
    setMsg(null);
    const h = handle.trim();
    if (!h) {
      setMsg("Please enter a handle.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch(`${API_BASE}/auth/dev`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: h }),
      });

      if (!res.ok) throw new Error(`auth/dev failed (${res.status})`);

      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("No token in response");

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem("fairwayd_handle", h);
      login(token);

      // go to feed after login (facebook-like)
      nav("/feed");
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => {
    logout();
    localStorage.removeItem(STORAGE_KEY);
    setMsg("Logged out.");
    nav("/");
  };

  const disabled = busy || loading;

  return (
    <div style={card}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
        {isAuthenticated ? "Account" : "Login"}
      </div>

      <div style={{ fontSize: 12, marginBottom: 12, opacity: 0.8 }}>
        {loading
          ? "Checking session…"
          : isAuthenticated
            ? "Authenticated"
            : "Not logged in"}
      </div>

      {/* Google / OAuth buttons */}
      <div style={{ display: "grid", gap: 10 }}>
        <GoogleLoginButton />

        {/* placeholders for later */}
        <button type="button" disabled style={oauthDisabledBtn}>
          Continue with Apple (soon)
        </button>
        <button type="button" disabled style={oauthDisabledBtn}>
          Continue with Facebook (soon)
        </button>
      </div>

      {/* Divider */}
      <div style={dividerRow}>
        <div style={dividerLine} />
        <div style={{ fontSize: 12, opacity: 0.6 }}>or</div>
        <div style={dividerLine} />
      </div>

      {/* Dev login only in dev */}
      {isDev && !isAuthenticated && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
            Dev login
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="handle (e.g. beda)"
              disabled={disabled}
              style={input}
            />
            <button
              type="button"
              onClick={doDevLogin}
              disabled={disabled}
              style={primarySmallBtn}
            >
              {busy ? "..." : "Login"}
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
            token in storage: {localStorage.getItem(STORAGE_KEY) ? "YES" : "NO"}
          </div>
        </div>
      )}

      {/* Logged in actions */}
      {isAuthenticated && (
        <div
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <button type="button" onClick={() => nav("/feed")} style={primaryBtn}>
            Go to feed
          </button>
          <button
            type="button"
            onClick={() => nav("/profile")}
            style={ghostBtn}
          >
            Profile
          </button>
          <button type="button" onClick={doLogout} style={ghostBtn}>
            Logout
          </button>
        </div>
      )}

      {msg && <div style={{ marginTop: 10, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
  padding: 18,
};

const oauthDisabledBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(0,0,0,0.04)",
  fontWeight: 900,
  cursor: "not-allowed",
  opacity: 0.7,
};

const dividerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 14,
  marginBottom: 14,
};

const dividerLine: React.CSSProperties = {
  height: 1,
  flex: 1,
  background: "rgba(0,0,0,0.1)",
};

const input: React.CSSProperties = {
  flex: 1,
  padding: "10px 10px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  fontWeight: 700,
};

const primarySmallBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: 0,
  background: "#111",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
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
