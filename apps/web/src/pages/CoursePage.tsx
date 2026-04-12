import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import PostCard from "../components/PostCard";

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  course: {
    id: string;
    name: string;
    lat: number;
    lon: number;
  };
  user: {
    id: string;
    handle: string;
  };
  images?: { id: string; url: string }[];
};

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;
  par?: number | null;
  access?: string | null;
};

function normalizeWebsite(url?: string | null) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const { token } = useAuth();

  const isMobile = window.innerWidth <= 980;

  const secondaryBtnStyle = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 800,
    cursor: "pointer",
  } as const;
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Load course + posts
  useEffect(() => {
    if (!courseId) return;

    const run = async () => {
      try {
        setLoading(true);

        // ✅ Course IMMER laden (ohne Token)
        const cRes = await fetch(`${API_BASE}/courses/${courseId}`);
        if (cRes.ok) {
          const c = await cRes.json();
          setCourse(c);
        }

        // ✅ Follow nur wenn eingeloggt
        if (token) {
          const fRes = await fetch(
            `${API_BASE}/courses/${courseId}/following`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (fRes.ok) {
            const f = await fRes.json();
            setFollowing(!!f?.following);
          }
        }

        // ✅ Posts (optional public später)

        const pRes = await fetch(`${API_BASE}/posts/course/${courseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (pRes.ok) {
          const data = await pRes.json();

          const nextPosts = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.posts)
                ? data.posts
                : [];

          setPosts(nextPosts);
        }
      } catch (err) {
        console.error("Course page load failed", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [courseId, token]);

  if (loading) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: isMobile ? 10 : 12,
        paddingBottom: isMobile ? 16 : 0,
      }}
    >
      <div style={{ padding: isMobile ? "8px 12px 0" : 0 }}>
        <button
          type="button"
          onClick={() => nav("/map")}
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Back to map
        </button>
      </div>

      {/* ===== HEADER ===== */}
      <div
        style={{
          padding: isMobile ? 12 : 18,
          borderRadius: 16,
          background: isMobile ? "rgba(0,0,0,0.03)" : "var(--card)",
          border: isMobile ? "none" : "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          ⛳ {course?.name ?? "Course"}
        </div>

        <div style={{ fontSize: 13, color: "var(--sub)", marginTop: 4 }}>
          {[course?.city, course?.region, course?.country]
            .filter(Boolean)
            .join(", ")}
        </div>
        {(course?.holes || course?.par || course?.access) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            {course?.holes ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                🏌️ {course.holes} holes
              </span>
            ) : null}

            {course?.par ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Par {course.par}
              </span>
            ) : null}

            {course?.access ? (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {course.access}
              </span>
            ) : null}
          </div>
        )}

        {normalizeWebsite(course?.website) && (
          <div style={{ marginTop: 10 }}>
            <a
              href={normalizeWebsite(course?.website)!}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--green)",
                textDecoration: "none",
                wordBreak: "break-word",
              }}
            >
              🌐 Visit website ↗
            </a>
          </div>
        )}

        {/* Guest sign-in banner */}
        {!token && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              🔒 Sign in to unlock full experience
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--sub)",
                lineHeight: 1.5,
              }}
            >
              Follow this course, post updates and join the conversation.
            </div>

            <button
              onClick={() => nav("/")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontWeight: 800,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={async () => {
              if (!courseId || !token || followBusy) return;

              try {
                setFollowBusy(true);

                const res = await fetch(
                  `${API_BASE}/courses/${courseId}/follow`,
                  {
                    method: following ? "DELETE" : "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );

                if (!res.ok) {
                  throw new Error(`Follow toggle failed: ${res.status}`);
                }

                setFollowing((prev) => !prev);
              } catch (err) {
                console.error("Course follow toggle failed", err);
              } finally {
                setFollowBusy(false);
              }
            }}
            disabled={followBusy}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: following ? "rgba(0,0,0,0.06)" : "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: followBusy ? "default" : "pointer",
              opacity: followBusy ? 0.7 : 1,
              boxShadow: "none",
            }}
          >
            {followBusy ? "Saving..." : following ? "✓ Following" : "+ Follow"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!course) return;

              nav("/feed", {
                state: {
                  focusCourse: {
                    id: course.id,
                    name: course.name,
                    lat: course.lat,
                    lon: course.lon,
                  },
                },
              });
            }}
            style={secondaryBtnStyle}
          >
            Post here
          </button>
        </div>
      </div>

      {/* ===== POSTS ===== */}
      <div style={{ display: "grid", gap: 10 }}>
        {posts.length === 0 ? (
          <div
            style={{
              color: "var(--sub)",
              fontSize: 13,
              padding: 16,
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--card)",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: 18, marginBottom: 8, color: "var(--text)" }}
            >
              {!token
                ? "Noch keine öffentlichen Posts verfügbar"
                : "Noch keine Posts zu diesem Platz"}
            </div>

            <div style={{ opacity: 0.85, lineHeight: 1.5 }}>
              Sei der Erste und teile etwas zu diesem Golfplatz.
            </div>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} isMobile={isMobile} />)
        )}
      </div>
    </div>
  );
}
