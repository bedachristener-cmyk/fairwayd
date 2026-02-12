import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type DevLoginProps = {
  onLoggedIn?: (token: string) => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// DevLogin nur lokal + private LAN
const isDev =
  import.meta.env.DEV ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname.startsWith("192.168.") ||
  location.hostname.startsWith("10.") ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(location.hostname);

export default function DevLogin({ onLoggedIn }: DevLoginProps) {
  const nav = useNavigate();
  const { loading, isAuthenticated, user, login, logout } = useAuth();

  const [handle, setHandle] = useState("beda");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ default: auf eigenen Geräten merken (kann User abwählen)
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const savedHandle = localStorage.getItem("fairwayd_handle");
    if (savedHandle) setHandle(savedHandle);

    const savedRemember = localStorage.getItem("fairwayd_remember_me");
    if (savedRemember != null) setRememberMe(savedRemember === "1");
  }, []);

  useEffect(() => {
    // preference immer persistieren (ist ok, kein Security Risiko)
    localStorage.setItem("fairwayd_remember_me", rememberMe ? "1" : "0");
  }, [rememberMe]);

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

      localStorage.setItem("fairwayd_handle", h);

      // ensure auth state is updated before we navigate
      await Promise.resolve();
      login(token, rememberMe);
      onLoggedIn?.(token);

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      nav(next || "/feed");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => {
    logout();
    setMsg("Logged out.");
    nav("/");
  };

  const disabled = busy || loading;

  // Wenn nicht in DEV/LAN, soll diese Komponente nichts rendern (Vercel/Prod)
  if (!isDev) return null;

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

      {/* OAuth buttons (platzhalter) */}
      <div style={{ display: "grid", gap: 10 }}>
        <button type="button" disabled style={oauthDisabledBtn}>
          Continue with Apple (soon)
        </button>
        <button type="button" disabled style={oauthDisabledBtn}>
          Continue with Facebook (soon)
        </button>
      </div>

      <div style={dividerRow}>
        <div style={dividerLine} />
        <div style={{ fontSize: 12, opacity: 0.6 }}>or</div>
        <div style={dividerLine} />
      </div>

      {/* ✅ Remember me checkbox */}
      {!isAuthenticated && (
        <label style={rememberRow}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={disabled}
          />
          <span style={{ fontSize: 12 }}>
            Angemeldet bleiben (auf fremden PCs deaktivieren)
          </span>
        </label>
      )}

      {/* Dev login */}
      {!isAuthenticated && (
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
        </div>
      )}

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

const card = {
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 12,
  padding: 16,
  background: "rgba(255,255,255,0.02)",
  maxWidth: 420,
  margin: "24px auto",
};

const rememberRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: "10px 0 14px",
  opacity: 0.85,
};

const oauthDisabledBtn = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "rgba(0,0,0,0.06)",
  opacity: 0.7,
  cursor: "not-allowed",
} as const;

const dividerRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "16px 0",
};

const dividerLine = {
  flex: 1,
  height: 1,
  background: "rgba(0,0,0,0.14)",
};

const input = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  outline: "none",
  background: "transparent",
} as const;

const primarySmallBtn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "rgba(0,0,0,0.08)",
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

const primaryBtn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "rgba(0,0,0,0.08)",
  cursor: "pointer",
} as const;

const ghostBtn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "transparent",
  cursor: "pointer",
} as const;
