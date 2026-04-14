import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

export default function FeedbackPage() {
  const nav = useNavigate();
  const { token } = useAuth();

  const [category, setCategory] = useState("ui");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) return;
    if (!message.trim()) {
      setErr("Please enter your feedback.");
      return;
    }

    try {
      setSending(true);
      setErr("");
      setDone(false);

      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          url: window.location.pathname,
          device: window.innerWidth <= 980 ? "mobile" : "desktop",
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to send feedback ${res.status} ${body}`);
      }

      setMessage("");
      setDone(true);
    } catch (e) {
      console.error("Feedback submit failed", e);
      setErr("Failed to send feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 12px 80px",
        boxSizing: "border-box",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.1,
            color: "var(--text)",
          }}
        >
          Feedback
        </div>

        <div
          style={{
            fontSize: 14,
            color: "var(--sub)",
            lineHeight: 1.45,
          }}
        >
          Share bugs, UI issues or ideas to improve Fairwayd.
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 12,
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            Category
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              height: 42,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              padding: "0 12px",
              boxSizing: "border-box",
            }}
          >
            <option value="ui">UI</option>
            <option value="bug">Bug</option>
            <option value="idea">Idea</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            Message
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should we improve?"
            rows={7}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              padding: "12px 12px",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          />
        </div>

        {err ? (
          <div
            style={{
              fontSize: 13,
              color: "crimson",
            }}
          >
            {err}
          </div>
        ) : null}

        {done ? (
          <div
            style={{
              fontSize: 13,
              color: "var(--sub)",
            }}
          >
            Feedback sent successfully.
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? "Sending..." : "Send feedback"}
          </button>

          <button
            type="button"
            onClick={() => nav(-1)}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
