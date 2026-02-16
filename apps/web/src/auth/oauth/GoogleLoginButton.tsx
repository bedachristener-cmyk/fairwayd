import { useEffect, useRef, useState } from "react";

function normalizeApiBase(v: string | undefined | null) {
  const s = (v ?? "").trim().replace(/\/+$/, "");
  if (!s) return "http://localhost:3000";
  if (/^https?:\/\//i.test(s)) return s;
  // if someone configured only "fairwayd-xyz.up.railway.app", assume https
  return `https://${s}`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
};

async function waitForGoogle(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function extractToken(data: any): string | null {
  const t =
    data?.token ?? data?.accessToken ?? data?.access_token ?? data?.jwt ?? null;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

async function readErrorMessage(res: Response) {
  // Try JSON first, then fallback to text/status
  try {
    const j = await res.json();
    if (j?.message) {
      return typeof j.message === "string"
        ? j.message
        : JSON.stringify(j.message);
    }
    if (j?.error) return String(j.error);
  } catch {
    // ignore
  }
  const text = await res.text().catch(() => "");
  const t = text.trim();
  return t ? t : `${res.status} ${res.statusText}`;
}

export default function GoogleLoginButton({ onToken, onError }: Props) {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fail = (m: string) => {
      setMsg(m);
      onError?.(m);
    };

    const init = async () => {
      setMsg(null);
      setReady(false);

      if (!GOOGLE_CLIENT_ID) {
        fail(
          "Google Login ist noch nicht konfiguriert (VITE_GOOGLE_CLIENT_ID fehlt).",
        );
        return;
      }

      const ok = await waitForGoogle();
      if (cancelled) return;

      if (!ok) {
        fail(
          'Google Script nicht geladen. Prüfe, ob in apps/web/index.html folgendes drin ist: <script src="https://accounts.google.com/gsi/client" async defer></script>',
        );
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
              if (!idToken)
                throw new Error(
                  "No credential (idToken) returned from Google.",
                );

              const res = await fetch(`${API_BASE}/auth/oauth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "GOOGLE", idToken }),
              });

              if (!res.ok) {
                const m = await readErrorMessage(res);
                throw new Error(m);
              }

              const data = await res.json();
              const token = extractToken(data);
              if (!token) throw new Error("Backend returned no token.");

              onToken(token);
              setMsg("Logged in with Google ✅");
            } catch (e: unknown) {
              fail(errMsg(e));
            }
          },
        });

        btnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });

        setReady(true);
      } catch (e: unknown) {
        fail(errMsg(e));
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [onToken, onError]);

  return (
    <div>
      <div ref={btnRef} />
      {!ready && !msg && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          Loading Google button…
        </div>
      )}
      {msg && <div style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
