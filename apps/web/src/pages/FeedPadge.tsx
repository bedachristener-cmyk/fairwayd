import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiGet } from "../api/client";

type Post = {
  id: string;
  userId: string;
  courseId: string;
  content: string;
  visibility: "FOLLOWERS" | "PUBLIC";
  createdAt: string;
};

type Course = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function FeedPage() {
  const nav = useNavigate();
  const { token } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const courseById = useMemo(() => {
    const m = new Map<string, Course>();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  const load = async () => {
    if (!token) return;

    setBusy(true);
    setErr(null);

    try {
      // parallel load
      const [feed, allCourses] = await Promise.all([
        apiGet<Post[]>("/posts/feed", { token }),
        apiGet<Course[]>("/courses"),
      ]);

      setPosts(Array.isArray(feed) ? feed : []);
      setCourses(Array.isArray(allCourses) ? allCourses : []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [posts]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Feed</h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => nav("/")} style={{ padding: "6px 10px" }}>
            ← Map
          </button>
          <button onClick={load} disabled={busy} style={{ padding: "6px 10px" }}>
            {busy ? "..." : "Reload"}
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(220,20,60,0.08)" }}>
          <div style={{ fontWeight: 700 }}>Error</div>
          <div style={{ fontFamily: "monospace", fontSize: 12 }}>{err}</div>
        </div>
      )}

      {!err && !busy && sorted.length === 0 && (
        <div style={{ marginTop: 12, opacity: 0.75 }}>No posts yet.</div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((p) => {
          const c = courseById.get(p.courseId);
          const courseLabel = c
            ? [c.name, c.city, c.country].filter(Boolean).join(" • ")
            : p.courseId;

          return (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>{courseLabel}</div>

              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{p.content}</div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                {p.visibility} • {formatWhen(p.createdAt)}
              </div>

              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => nav(`/compose?courseId=${encodeURIComponent(p.courseId)}`)}
                  style={{ padding: "6px 10px" }}
                >
                  Reply / Post there
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
