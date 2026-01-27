import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: any;
  }
}

async function waitForGoogle(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

export default function GoogleLoginButton() {
  const { login } = useAuth();
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setMsg(null);

      if (!GOOGLE_CLIENT_ID) {
        setMsg("Missing VITE_GOOGLE_CLIENT_ID in frontend env (.env.local).");
        return;
      }

      const ok = await waitForGoogle();
      if (cancelled) return;

      if (!ok) {
        setMsg('Google script not loaded. Check index.html has: <script src="https://accounts.google.com/gsi/client" async defer></script>');
        return;
      }

      if (!btnRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            try {
              setMsg(null);
              const idToken = resp?.credential;
              if (!idToken) throw new Error("No credential (idToken) returned from Google.");

              const res = await fetch(`${API_BASE}/auth/oauth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: "GOOGLE",
                  idToken,
                }),
              });

              if (!res.ok) {
                let text = `POST /auth/oauth failed (${res.status})`;
                try {
                  const j = await res.json();
                  if (j?.message) text = typeof j.message === "string" ? j.message : JSON.stringify(j.message);
                } catch {
                  // ignore
                }
                throw new Error(text);
              }

              const data = await res.json();
              const token = data?.token;
              if (!token) throw new Error("Backend returned no token.");

              login(token);
              setMsg("Logged in with Google ✅");
            } catch (e: any) {
              setMsg(e?.message ?? String(e));
            }
          },
        });

        // Clear and render button
        btnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
        });

        setReady(true);
      } catch (e: any) {
        setMsg(e?.message ?? String(e));
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [login]);

  return (
    <div>
      <div ref={btnRef} />
      {!ready && !msg && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Loading Google button…</div>}
      {msg && <div style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
