import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiPost } from "../api/client";

type Post = {
  id: string;
  userId: string;
  courseId: string;
  content: string;
  visibility: "FOLLOWERS" | "PUBLIC";
  createdAt: string;
};

export default function ComposePost() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const courseId = params.get("courseId") ?? "";

  const { token, user } = useAuth();

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"FOLLOWERS" | "PUBLIC">("FOLLOWERS");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canPost = useMemo(() => {
    return !!courseId && !!content.trim() && !!token;
  }, [courseId, content, token]);

  const submit = async () => {
    setMsg(null);

    if (!courseId) {
      setMsg("Missing courseId.");
      return;
    }

    const text = content.trim();
    if (!text) {
      setMsg("Please enter some text.");
      return;
    }

    if (!token) {
      setMsg("Not logged in.");
      return;
    }

    try {
      setBusy(true);

      await apiPost<Post>("/posts", {
        token,
        body: {
          courseId,
          content: text,
          visibility,
        },
      });

      setMsg("Posted ✅");
      setContent("");

      // back to map after a short moment
      setTimeout(() => nav("/"), 600);
    } catch (e: any) {
      setMsg(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 520 }}>
      <h2 style={{ margin: 0 }}>Create post</h2>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        User: {user?.handle || user?.name || user?.id}
      </div>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        CourseId: <span style={{ fontFamily: "monospace" }}>{courseId || "(missing)"}</span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What’s happening here?"
        rows={5}
        style={{ width: "100%", marginTop: 12, padding: 10 }}
        disabled={busy}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "FOLLOWERS" | "PUBLIC")}
          disabled={busy}
        >
          <option value="FOLLOWERS">FOLLOWERS</option>
          <option value="PUBLIC">PUBLIC</option>
        </select>

        <button onClick={submit} disabled={!canPost || busy} style={{ padding: "6px 12px" }}>
          {busy ? "Posting..." : "Post"}
        </button>

        <button onClick={() => nav("/")} disabled={busy} style={{ padding: "6px 12px" }}>
          Cancel
        </button>
      </div>

      {msg && <div style={{ marginTop: 10, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
