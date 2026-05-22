import { useMemo, useState } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type FeedbackCategory = "bug" | "idea" | "ui" | "other";

function detectDeviceType() {
  const ua = window.navigator.userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/android/.test(ua) || /iphone|ipod/.test(ua) || /mobile/.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

export default function StageFeedbackWidget() {
  const { token, isAuthenticated } = useAuth();

  const isStage = useMemo(() => {
    const host = window.location.hostname.toLowerCase();

    if (host.includes("localhost")) return true;

    return host.includes("git-stage") || host.includes("stage");
  }, []);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  if (!isStage) return null;

  async function handleSend() {
    if (!isAuthenticated || !token) {
      setErr("Please sign in first.");
      return;
    }

    const text = message.trim();
    if (!text) {
      setErr("Please enter your feedback first.");
      return;
    }

    try {
      setSending(true);
      setErr("");
      setDone(false);

      const device = detectDeviceType();
      const userAgent = window.navigator.userAgent;

      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          category,
          url: window.location.href,
          device,
          userAgent,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Feedback request failed ${res.status} ${body}`);
      }

      setMessage("");
      setCategory("bug");
      setDone(false);
      setOpen(false);
    } catch (e) {
      console.error("Feedback send failed", e);
      setErr("Sending feedback failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setErr("");
        }}
        style={{
          position: "fixed",
          right: 16,
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          zIndex: 9999,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          borderRadius: 999,
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}
      >
        💬 Feedback
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  Stage Feedback
                </div>
                <div style={{ fontSize: 13, color: "var(--sub)" }}>
                  Send feedback directly from this test build.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Category
              </div>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as FeedbackCategory)
                }
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  padding: 12,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="bug">Bug</option>
                <option value="ui">UI</option>
                <option value="idea">Idea</option>
                <option value="other">Other</option>
              </select>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened? What did you expect? Which device/page are you on?"
              rows={7}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                padding: 12,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--sub)",
                display: "grid",
                gap: 4,
                wordBreak: "break-all",
              }}
            >
              <div>Page: {window.location.href}</div>
              <div>Device: {detectDeviceType()}</div>
            </div>

            {err ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: "#b42318",
                }}
              >
                {err}
              </div>
            ) : null}

            {done ? (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: "#067647",
                }}
              >
                Feedback sent successfully.
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: sending ? "default" : "pointer",
                  opacity: sending ? 0.7 : 1,
                  fontWeight: 700,
                }}
              >
                {sending ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
