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

  // courseId resolution priority:
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

      // Inline mode: prefer callback
      if (props.onPosted) {
        props.onPosted();
        setMsg(null);
        return;
      }

      // Page mode: keep old behavior
      setMsg("Posted!");
      nav("/feed");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to post.");
    } finally {
      setBusy(false);
    }
  };

  const title = props.onPosted ? "Create post" : "Compose post";
  const helperText = props.onPosted
    ? "Share a quick golf moment with the Fairwayd feed."
    : "Create a new feed post for this course.";
  const label = props.courseName
    ? props.courseName
    : courseId
      ? `courseId: ${courseId}`
      : "courseId: (missing)";

  const composer = (
    <div
      style={{
        background: "color-mix(in srgb, var(--card) 86%, transparent)",
        border: "1px solid color-mix(in srgb, var(--border) 38%, transparent)",
        borderRadius: props.onPosted ? 22 : 24,
        padding: props.onPosted ? 14 : "16px 14px",
        boxShadow: "none",
        fontFamily: "system-ui",
        maxWidth: props.onPosted ? undefined : 680,
        margin: props.onPosted ? undefined : "0 auto",
        color: "var(--text)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: props.onPosted ? 18 : 24,
              lineHeight: 1.12,
              letterSpacing: -0.35,
              fontWeight: 850,
              color: "var(--text)",
            }}
          >
            {title}
          </h2>
          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              lineHeight: 1.35,
              color: "var(--sub)",
            }}
          >
            {helperText}
          </div>
        </div>

        {!props.hideBack && !props.onPosted && (
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Back"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: 850,
              flexShrink: 0,
            }}
          >
            ?
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          marginBottom: 12,
          borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--border) 54%, transparent)",
          background: "color-mix(in srgb, var(--muted) 66%, transparent)",
          minWidth: 0,
        }}
        title={courseId}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "color-mix(in srgb, var(--green) 14%, var(--card))",
            color: "var(--green)",
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          ?
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--sub)",
              fontWeight: 750,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Course
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--text)",
              fontWeight: 850,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          padding: "4px 0",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            minWidth: 38,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--muted)",
            color: "var(--text)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          FW
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your round, trip or golf story..."
          rows={props.onPosted ? 4 : 7}
          style={{
            width: "100%",
            padding: "6px 0 8px",
            borderRadius: 0,
            border: "none",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 16,
            lineHeight: 1.45,
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {msg ? (
          <div
            style={{
              fontSize: 13,
              color: msg === "Posted!" ? "var(--green)" : "var(--sub)",
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--sub)" }}>
            Posts are shared publicly.
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy || !content.trim()}
          style={{
            minHeight: 42,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--green) 72%, var(--border))",
            background: "var(--green)",
            color: "white",
            cursor: busy || !content.trim() ? "not-allowed" : "pointer",
            fontWeight: 850,
            opacity: busy || !content.trim() ? 0.55 : 1,
            boxShadow:
              busy || !content.trim()
                ? "none"
                : "0 10px 24px color-mix(in srgb, var(--green) 24%, transparent)",
          }}
        >
          {busy ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );

  if (props.onPosted) return composer;

  return (
    <div
      className="fw-page-shell"
      style={{
        minHeight: "100dvh",
        boxSizing: "border-box",
        padding:
          "calc(18px + env(safe-area-inset-top, 0px)) 14px calc(96px + env(safe-area-inset-bottom, 0px))",
        background: "transparent",
      }}
    >
      {composer}
    </div>
  );
}
