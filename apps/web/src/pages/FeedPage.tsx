// ====== IMPORTS ======
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import CourseDropdown, { type CourseLite } from "../components/CourseDropdown";

// ====== TYPES ======
type PostImage = { id: string; url: string };

type Post = {
  id: string;
  content: string;
  createdAt: string;
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
  images?: PostImage[];
};

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

// ====== UI HELPERS ======

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        padding: 12,
        color: "var(--text)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function PillButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: disabled ? "rgba(255,255,255,.08)" : "var(--muted)",
        color: disabled ? "rgba(255,255,255,.45)" : "var(--text)",
        cursor: disabled ? "default" : "pointer",
        fontWeight: 800,
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

function Avatar({ handle }: { handle: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "1px solid var(--border)",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
      }}
    >
      {initials(handle)}
    </div>
  );
}

// ====== POST CARD ======

function PostCard({
  post,
  onSelectCourse,
  onOpenProfile,
  onOpenCourse,
}: {
  post: Post;
  onSelectCourse: () => void;
  onOpenProfile: () => void;
  onOpenCourse: () => void;
}) {
  const nav = useNavigate();

  const img = post.images?.[0]?.url
    ? post.images[0].url.startsWith("http") ||
      post.images[0].url.startsWith("blob:")
      ? post.images[0].url
      : `${API_BASE}${post.images[0].url}`
    : null;

  return (
    <div
      onClick={onSelectCourse}
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", gap: 10, padding: 12 }}>
        <Avatar handle={post.user.handle} />

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                nav(`/u/${post.user.handle}`);
              }}
              style={{ cursor: "pointer" }}
            >
              @{post.user.handle}
            </span>{" "}
            ·{" "}
            <span style={{ color: "var(--sub)" }}>
              {timeAgo(post.createdAt)}
            </span>
          </div>

          {/* COURSE + MAP ICON */}
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                onOpenCourse();
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontWeight: 900,
              }}
            >
              ⛳ {post.course.name}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCourse();
              }}
              style={{
                marginLeft: "auto",
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,.06)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 48 48" width="20" height="20">
                <path
                  fill="#34A853"
                  d="M24 4c6.6 0 12 5.4 12 12 0 9-12 28-12 28S12 25 12 16c0-6.6 5.4-12 12-12z"
                />
                <circle cx="24" cy="16" r="5" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* IMAGE */}
      {img && <img src={img} style={{ width: "100%" }} />}

      {/* TEXT */}
      <div style={{ padding: 12 }}>{post.content}</div>
    </div>
  );
}

// ====== MAIN PAGE ======

export default function FeedPage() {
  const nav = useNavigate();
  const { selectedCourse, setSelectedCourse, clearSelectedCourse } =
    useSelectedCourse();

  const auth = useAuth() as any;
  const token =
    auth?.token ||
    localStorage.getItem("fairwayd_token") ||
    localStorage.getItem("token") ||
    "";

  const handle = localStorage.getItem("fairwayd_handle") || "me";

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Load feed
  const loadFeed = useCallback(async () => {
    const res = await fetch(`${API_BASE}/posts/feed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPosts(data.items);
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const coursesLite: CourseLite[] = useMemo(
    () => courses.map((c) => ({ id: c.id, name: c.name })),
    [courses],
  );

  return (
    <Card title="Feed">
      {/* STICKY COMPOSER */}
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 30,
          marginBottom: 12,
        }}
      >
        <textarea
          ref={draftRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What’s your golf moment?"
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: 10,
            background: "var(--muted)",
          }}
        />
      </div>

      {/* POSTS */}
      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onSelectCourse={() =>
              setSelectedCourse({
                id: p.course.id,
                name: p.course.name,
                lat: p.course.lat,
                lon: p.course.lon,
              })
            }
            onOpenProfile={() => nav(`/u/${p.user.handle}`)}
            onOpenCourse={() =>
              setSelectedCourse({
                id: p.course.id,
                name: p.course.name,
                lat: p.course.lat,
                lon: p.course.lon,
              })
            }
          />
        ))}
      </div>
    </Card>
  );
}
