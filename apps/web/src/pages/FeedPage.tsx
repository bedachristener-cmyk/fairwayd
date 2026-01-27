import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type FeedItem = {
  courseId: string;
  courseName: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
  lastPost?: {
    id: string;
    content: string;
    createdAt: string;
    user?: {
      id: string;
      handle: string;
      name?: string | null;
      avatarUrl?: string | null;
    };
  } | null;
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function FeedPage() {
  const nav = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!token) {
      setErr("No token found. Please login again.");
      return;
    }

    const ac = new AbortController();

    const run = async () => {
      try {
        setBusy(true);
        setErr(null);

        const res = await fetch(`${API_BASE}/feed`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`GET /feed failed (HTTP ${res.status})`);

        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setErr(e?.message ?? "Failed to load feed");
        setItems([]);
      } finally {
        setBusy(false);
      }
    };

    run();

    return () => {
      ac.abort();
    };
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <div style={{ padding: 16, fontFamily: "system-ui" }}>Please login.</div>;
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Feed</h2>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          {busy ? "Loading..." : `${items.length} courses`}
        </div>
      </div>

      {err && (
        <div
          style={{
            marginTop: 12,
            background: "#fff3f3",
            border: "1px solid #ffd0d0",
            padding: 12,
            borderRadius: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {items.map((it) => {
          const place = [it.city, it.region, it.country].filter(Boolean).join(", ");

          const preview = (it.lastPost?.content ?? "").trim();
          const who = it.lastPost?.user?.handle ?? "unknown";
          const when = it.lastPost?.createdAt ? fmtWhen(it.lastPost.createdAt) : "";

          return (
            <div
              key={it.courseId}
              onClick={() => nav(`/?courseId=${encodeURIComponent(it.courseId)}`)}
              style={{
                cursor: "pointer",
                background: "white",
                borderRadius: 16,
                padding: 14,
                boxShadow: "0 2px 12px rgba(0,0,0,.08)",
                border: "1px solid rgba(0,0,0,.06)",
              }}
              title="Open on map"
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{it.courseName}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{place}</div>
              </div>

              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 800 }}>{who}:</span>{" "}
                <span style={{ opacity: 0.9 }}>
                  {preview.length > 140 ? preview.slice(0, 140) + "…" : preview || (
                    <i style={{ opacity: 0.6 }}>No content</i>
                  )}
                </span>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>{when}</div>
            </div>
          );
        })}
      </div>

      {!busy && !err && items.length === 0 && (
        <div style={{ marginTop: 16, opacity: 0.7 }}>
          No activity yet. Create a post on a course.
        </div>
      )}
    </div>
  );
}
