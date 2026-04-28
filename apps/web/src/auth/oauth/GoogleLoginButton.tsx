import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
};

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function hasGoogleIdentity() {
  return Boolean(window.google?.accounts?.id);
}

function getGoogleScript() {
  return Array.from(document.scripts).find((script) =>
    script.src.startsWith(GOOGLE_SCRIPT_SRC),
  );
}

function ensureGoogleScript() {
  const existing = getGoogleScript();
  if (existing) return existing;

  const script = document.createElement("script");
  script.src = GOOGLE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  return script;
}

async function waitForGoogle(timeoutMs = 8000) {
  if (hasGoogleIdentity()) return true;

  const script = ensureGoogleScript();
  const start = Date.now();
  const waitForScriptEvent = new Promise<void>((resolve) => {
    const done = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      resolve();
    };
    const onLoad = () => done();
    const onError = () => done();

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });

  while (Date.now() - start < timeoutMs) {
    if (hasGoogleIdentity()) return true;

    const remaining = timeoutMs - (Date.now() - start);
    await Promise.race([
      waitForScriptEvent,
      new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining))),
    ]);

  }

  return hasGoogleIdentity();
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export default function GoogleLoginButton({ onToken, onError }: Props) {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useEffect(() => {
    let cancelled = false;

    const fail = (m: string) => {
      if (cancelled) return;
      setMsg(m);
      setReady(false);
      onErrorRef.current?.(m);
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
          "Google Script nicht geladen. Bitte Verbindung, Browser-Blocker oder Google Identity Services prüfen.",
        );
        return;
      }

      if (!btnRef.current) {
        fail("Google Button Container nicht gefunden.");
        return;
      }

      try {
        btnRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            try {
              setMsg(null);

              const idToken = resp?.credential;
              if (!idToken) {
                throw new Error(
                  "No credential (idToken) returned from Google.",
                );
              }

              const res = await fetch(`${API_BASE}/auth/oauth`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "GOOGLE", idToken }),
              });

              if (!res.ok) {
                let text = `POST /auth/oauth failed (${res.status})`;
                try {
                  const j = await res.json();
                  if (j?.message) {
                    text =
                      typeof j.message === "string"
                        ? j.message
                        : JSON.stringify(j.message);
                  }
                } catch {
                  // ignore
                }
                throw new Error(text);
              }

              const data = await res.json();

              const token =
                data?.token ??
                data?.accessToken ??
                data?.access_token ??
                data?.jwt;

              if (!token || typeof token !== "string") {
                throw new Error("Backend returned no token.");
              }

              onTokenRef.current(token);
            } catch (e: unknown) {
              fail(errMsg(e));
            }
          },
        });

        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 280,
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
  }, []);

  return (
    <div>
      <div ref={btnRef} />
      {!ready && !msg && (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          Loading Google button...
        </div>
      )}
      {msg && <div style={{ marginTop: 6, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
