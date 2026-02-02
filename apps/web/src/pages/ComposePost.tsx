import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type Props = {
  /** Inline usage: provide courseId directly */
  courseId?: string;
  /** Inline usage: callback after successful post */
  onPosted?: () => void;
  /** Inline usage: optional label for UX */
  courseName?: string;
  /** Inline usage: optionally hide Back button */
  hideBack?: boolean;
};

export default function ComposePost(props: Props) {
  const nav = useNavigate();
  const params = useParams();
  const q = useQuery();

  // ✅ courseId resolution priority:
  // 1) props.courseId (inline)
  // 2) /compose/:courseId
  // 3) /compose?courseId=
  const courseId = (
    props.courseId ??
    params.courseId ??
    q.get("courseId") ??
    ""
  ).trim();

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
      setMsg("Missing courseId.");
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

      setContent("");

      // ✅ Inline mode: prefer callback
      if (props.onPosted) {
        props.onPosted();
        setMsg(null);
        return;
      }

      // ✅ Page mode: keep old behavior
      setMsg("Posted!");
      nav("/feed");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to post.");
    } finally {
      setBusy(false);
    }
  };

  const title = props.onPosted ? "Create post" : "Compose post";
  const label = props.courseName
    ? `📍 ${props.courseName}`
    : courseId
      ? `courseId: ${courseId}`
      : "courseId: (missing)";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        fontFamily: "system-ui",
        maxWidth: props.onPosted ? undefined : 720,
        margin: props.onPosted ? undefined : "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>{title}</h2>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,.06)",
            whiteSpace: "nowrap",
          }}
          title={courseId}
        >
          {label}
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your post..."
        rows={props.onPosted ? 3 : 6}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,.12)",
          fontFamily: "inherit",
          outline: "none",
          resize: "none",
        }}
      />

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "none",
            background: "#222",
            color: "white",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {busy ? "Posting..." : "Post"}
        </button>

        {!props.hideBack && !props.onPosted && (
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
        )}

        {msg && <div style={{ fontSize: 12, opacity: 0.8 }}>{msg}</div>}
      </div>
    </div>
  );
}
