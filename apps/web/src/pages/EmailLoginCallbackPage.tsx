import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { consumeStoredPostLoginNext } from "../auth/postLoginNext";
const emailVerifyRequests = new Map<string, Promise<string>>();

function verifyEmailTokenOnce(token: string) {
  const existing = emailVerifyRequests.get(token);
  if (existing) return existing;

  const request = fetch(`${API_BASE}/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : typeof data?.message === "string"
            ? data.message
            : "Invalid or expired login link";
        throw new Error(message);
      }

      const data = await res.json();
      const jwt = String(data?.token ?? "").trim();
      if (!jwt) throw new Error("Login response did not include a token");
      return jwt;
    })
    .catch((error) => {
      emailVerifyRequests.delete(token);
      throw error;
    });

  emailVerifyRequests.set(token, request);
  return request;
}

export default function EmailLoginCallbackPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const token = params.get("token") ?? "";

    if (!token.trim()) {
      setStatus("error");
      setMessage("This login link is missing a token.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const jwt = await verifyEmailTokenOnce(token);
        if (cancelled) return;

        setStatus("success");
        setStatus("success");
        setMessage("Login confirmed. Opening Fairwayd...");

        const next = consumeStoredPostLoginNext();

        login(jwt, true);

        setTimeout(() => {
          nav(next ?? "/feed", { replace: true });
        }, 0);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof Error && err.message
              ? err.message
              : "This login link is invalid or expired.",
          );
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [login, nav, params]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        color: "var(--text)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          boxSizing: "border-box",
          border: "1px solid var(--border)",
          borderRadius: 18,
          background: "var(--card)",
          padding: 18,
          display: "grid",
          gap: 12,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>Email login</div>
        <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
          {message}
        </div>
        {status === "error" ? (
          <button
            type="button"
            onClick={() => nav("/", { replace: true })}
            style={{
              border: "1px solid var(--border)",
              background: "var(--text)",
              color: "var(--bg)",
              borderRadius: 999,
              padding: "10px 12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Back to login
          </button>
        ) : null}
      </div>
    </div>
  );
}
