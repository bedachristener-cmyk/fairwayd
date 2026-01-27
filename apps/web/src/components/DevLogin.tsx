import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "./GoogleLoginButton";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const STORAGE_KEY = "fairwayd_token";

export default function DevLogin() {
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
    }
  }, [loading, isAuthenticated, user]);

  const doLogin = async () => {
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

      if (!res.ok) {
        throw new Error(`auth/dev failed (${res.status})`);
      }

      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("No token in response");

      // ✅ HARD persist (this is the missing piece in your browser)
      localStorage.setItem(STORAGE_KEY, token);

      // ✅ also update context state
      login(token);

      localStorage.setItem("fairwayd_handle", h);

      setMsg(`Dev login OK as ${h} ✅`);

      // ✅ jump to feed (so you immediately see it works)
      window.location.href = "/feed";
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
    window.location.href = "/";
  };

  const disabled = busy || loading;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 1000,
        background: "white",
        padding: 10,
        borderRadius: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        fontFamily: "system-ui",
        width: 260,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Login</div>

      <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.85 }}>
        {loading ? "Checking session…" : isAuthenticated ? "Authenticated" : "Not logged in"}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="handle (e.g. beda)"
          disabled={disabled || isAuthenticated}
          style={{ padding: 6, width: 160 }}
        />

        {!isAuthenticated ? (
          <button onClick={doLogin} disabled={disabled} style={{ padding: "6px 10px" }}>
            {busy ? "..." : "Dev Login"}
          </button>
        ) : (
          <button onClick={doLogout} disabled={disabled} style={{ padding: "6px 10px" }}>
            Logout
          </button>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <GoogleLoginButton />
      </div>

      {/* ✅ quick debug line */}
      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
        token in storage: {localStorage.getItem(STORAGE_KEY) ? "YES" : "NO"}
      </div>

      {msg && <div style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
