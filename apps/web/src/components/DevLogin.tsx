import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type DevLoginProps = {
  onLoggedIn?: (token: string) => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const STORAGE_KEY = "fairwayd_token";

// show dev login on localhost + private LAN + (optional) vercel previews
const isDev =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.hostname.startsWith("192.168.") ||
  location.hostname.endsWith(".vercel.app"); // <-- optional, hilft dir für Tests

export default function DevLogin({ onLoggedIn }: DevLoginProps) {
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

      // ensure auth state is updated before we navigate
      await Promise.resolve();
      login(token);
      onLoggedIn?.(token);

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      nav(next || "/feed");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMsg(msg);
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

// styles bleiben wie bei dir...
