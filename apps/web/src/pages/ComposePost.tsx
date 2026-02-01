import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ComposePost() {
  const nav = useNavigate();
  const params = useParams();
  const q = useQuery();

  // ✅ accept BOTH formats:
  // - /compose/:courseId  (preferred)
  // - /compose?courseId=  (legacy / accidental)
  const courseId = (params.courseId ?? q.get("courseId") ?? "").trim();

  const { token, isAuthenticated } = useAuth() as any;

  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);

    if (!isAuthenticated || !token) {
      setMsg("Not logged in.");
      return;
    }
    if (!courseId) {
      setMsg("Missing courseId in URL.");
      return;
    }
    if (!content.trim()) {
      setMsg("Please write something.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          content: content.trim(),
          visibility: "PUBLIC",
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      setMsg("Posted!");
      setContent("");

      // go back to feed
      nav("/feed");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to post.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Compose post</h2>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
        courseId: {courseId || "(missing)"}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your post..."
        rows={6}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "1px solid #ddd",
          fontFamily: "inherit",
        }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "none",
            background: "#222",
            color: "white",
            cursor: "pointer",
          }}
        >
          {busy ? "Posting..." : "Post"}
        </button>

        <button
          onClick={() => nav(-1)}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>

      {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
