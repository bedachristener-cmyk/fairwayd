import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleLoginButton() {
  const { login, isAuthenticated, loading } = useAuth();
  const divRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;

    if (!GOOGLE_CLIENT_ID) {
      setMsg("Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }

    const googleId = window.google?.accounts?.id;
    if (!googleId) {
      // Script evtl. noch nicht geladen -> keine Fehlermeldung spammen
      return;
    }

    if (!divRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    googleId.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp: any) => {
        try {
          setMsg(null);

          const credential = resp?.credential;
          if (!credential) throw new Error("No Google credential received");
          try {
            const payload = JSON.parse(atob(credential.split(".")[1]));
            console.log("GOOGLE aud:", payload?.aud);
            console.log("GOOGLE iss:", payload?.iss);
            console.log("GOOGLE azp:", payload?.azp);
            console.log("GOOGLE exp:", payload?.exp);
          } catch (e) {
            console.log("Failed to decode google credential", e);
          }

          const r = await fetch(`${API_BASE}/auth/oauth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "GOOGLE",
              idToken: credential,
            }),
          });

          if (!r.ok) {
            let text = `auth/oauth failed (${r.status})`;
            try {
              const j = await r.json();
              if (j?.message) {
                text =
                  typeof j.message === "string"
                    ? j.message
                    : JSON.stringify(j.message);
              }
            } catch {}
            throw new Error(text);
          }

          const data = await r.json();
          const token = data?.token;
          if (!token) throw new Error("No token in response");

          login(token);
          setMsg("Logged in with Google ✅");
        } catch (e: any) {
          setMsg(e?.message ?? String(e));
        }
      },
    });

    googleId.renderButton(divRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
    });

    // Optional One Tap (wenn du willst später)
    // googleId.prompt();
  }, [login, isAuthenticated, loading]);

  return (
    <div>
      {!isAuthenticated && <div ref={divRef} />}
      {msg && <div style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
