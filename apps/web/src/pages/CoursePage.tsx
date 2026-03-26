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
  city?: string;
  country?: string;
};

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const { token } = useAuth();

  const isMobile = window.innerWidth <= 980;

  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Load course + posts
  useEffect(() => {
    if (!courseId || !token) return;

    const run = async () => {
      try {
        setLoading(true);

        // Course laden
        const cRes = await fetch(`${API_BASE}/courses/${courseId}`);
        if (cRes.ok) {
          const c = await cRes.json();
          setCourse(c);
        }

        // Follow-Status laden
        const fRes = await fetch(`${API_BASE}/courses/${courseId}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (fRes.ok) {
          const f = await fRes.json();
          setFollowing(!!f?.following);
        }

        // Posts laden
        const pRes = await fetch(
          `${API_BASE}/posts/by-course?courseId=${courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (pRes.ok) {
          const data = await pRes.json();
          setPosts(Array.isArray(data?.items) ? data.items : []);
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
    <div style={{ display: "grid", gap: 12 }}>
      {/* ===== HEADER ===== */}
      <div
        style={{
          padding: isMobile ? 12 : 16,
          borderRadius: isMobile ? 0 : 16,
          border: isMobile ? "none" : "1px solid var(--border)",
          background: isMobile ? "transparent" : "var(--card)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          ⛳ {course?.name ?? "Course"}
        </div>

        <div style={{ fontSize: 13, color: "var(--sub)", marginTop: 4 }}>
          {[course?.city, course?.country].filter(Boolean).join(", ")}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
              background: following ? "var(--muted)" : "var(--text)",
              color: following ? "var(--text)" : "var(--bg)",
              fontWeight: 800,
              cursor: followBusy ? "default" : "pointer",
              opacity: followBusy ? 0.7 : 1,
            }}
          >
            {followBusy ? "Saving..." : following ? "Following" : "Follow"}
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
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
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
              Noch keine Posts zu diesem Platz
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
