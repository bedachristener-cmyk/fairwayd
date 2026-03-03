import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const fileUrl = (u: string) =>
  u.startsWith("blob:") || u.startsWith("http") ? u : `${API_ORIGIN}${u}`;
import { useAuth } from "../auth/AuthContext";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import CourseDropdown, { type CourseLite } from "../components/CourseDropdown";

type PostImage = { id: string; url: string };

type Post = {
  id: string;
  content: string;
  createdAt: string;
  visibility?: "PUBLIC" | "FOLLOWERS";
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

export default function FeedPage() {
  const nav = useNavigate();
  const { selectedCourse, setSelectedCourse, clearSelectedCourse } =
    useSelectedCourse();

  const { token, user, loading, logout, isAuthenticated } = useAuth();

  const handle =
    user?.handle || localStorage.getItem("fairwayd_handle") || "me";

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">(
    "PUBLIC",
  );

  const [err, setErr] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  // --- Load courses once (dropdown)
  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/courses`);
        if (!r.ok) return;
        const d = await r.json();
        setCourses(Array.isArray(d) ? d : []);
      } catch {
        setCourses([]);
      }
    };
    run();
  }, []);

  // --- Image preview
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // --- Load feed
  const loadFeed = useCallback(async () => {
    if (!token) return;

    try {
      setErr(null);

      const res = await fetch(`${API_BASE}/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const data = await res.json();
      setPosts(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load feed");
    }
  }, [token, logout]);

  // ✅ Load feed only when auth is ready AND token exists
  useEffect(() => {
    if (loading) return;
    if (!token) return;
    loadFeed();
  }, [loading, token, loadFeed]);

  // Focus composer when course gets selected
  useEffect(() => {
    if (!selectedCourse) return;
    const t = window.setTimeout(() => {
      draftRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [selectedCourse]);

  // --- CoursesLite for dropdown component
  const coursesLite: CourseLite[] = useMemo(
    () => courses.map((c) => ({ id: c.id, name: c.name })),
    [courses],
  );

  // Helpers: selected course must have the full data for posting
  const selectedName = selectedCourse?.name;
  const selectedLat = selectedCourse?.lat;
  const selectedLon = selectedCourse?.lon;

  const selectedIsComplete =
    Boolean(selectedCourse?.id) &&
    typeof selectedName === "string" &&
    selectedName.trim().length > 0 &&
    typeof selectedLat === "number" &&
    typeof selectedLon === "number";

  // --- Submit post (optimistic)
  const submitPost = async () => {
    if (!selectedCourse) {
      setErr("Choose a course first.");
      return;
    }

    if (!selectedIsComplete) {
      setErr(
        "Selected course is missing details (name/coordinates). Please re-select the course.",
      );
      return;
    }

    const text = draft.trim();
    if (!text && !file) {
      setErr("Write something or add a photo.");
      return;
    }

    if (!token) {
      setErr("Missing auth token. Please login again.");
      return;
    }

    setPosting(true);
    setErr(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Post = {
      id: optimisticId,
      content: text,
      createdAt: new Date().toISOString(),
      visibility,
      course: {
        id: selectedCourse.id,
        name: selectedName!,
        lat: selectedLat!,
        lon: selectedLon!,
      },
      user: { id: "me", handle },
      images: preview ? [{ id: "preview", url: preview }] : [],
    };

    setPosts((prev) => [optimistic, ...prev]);

    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourse.id);
      fd.append("content", text);
      fd.append("visibility", visibility);
      if (file) fd.append("image", file);

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error("Unauthorized. Please login again.");
      }

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const created = (await res.json()) as Post;

      setDraft("");
      setFile(null);
      setPreview(null);

      setPosts((prev) => {
        const rest = prev.filter((p) => p.id !== optimisticId);
        return [created, ...rest];
      });
    } catch (e: any) {
      setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  // While booting or not logged in
  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Card title="Feed">
          <div style={{ color: "var(--sub)", fontSize: 13 }}>
            Bitte neu einloggen (DB Reset hat den alten Token ungültig gemacht).
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err && (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(255,0,0,.08)",
            border: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      )}

      <Card title="Feed">
        {/* ===== Sticky Composer ===== */}
        <div
          style={{ position: "sticky", top: 12, zIndex: 20, paddingBottom: 12 }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              background: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Course + visibility row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CourseDropdown
                  courses={coursesLite}
                  selectedCourseId={selectedCourse?.id ?? null}
                  onSelect={(id) => {
                    const c = courses.find((x) => x.id === id);
                    if (c) setSelectedCourse(c);
                  }}
                  onClear={() => clearSelectedCourse()}
                  placeholder="Choose course"
                />

                {!selectedCourse ? (
                  <div style={{ fontSize: 12, color: "var(--sub)" }}>
                    Pick a course before posting.
                  </div>
                ) : null}
              </div>

              <div style={{ marginLeft: "auto" }}>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as "PUBLIC" | "FOLLOWERS")
                  }
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    fontWeight: 800,
                  }}
                  disabled={posting}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="FOLLOWERS">FOLLOWERS</option>
                </select>
              </div>
            </div>

            <textarea
              ref={draftRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (err) setErr(null);
              }}
              placeholder="What’s your golf moment?"
              rows={3}
              style={{
                width: "100%",
                marginTop: 10,
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: 10,
                background: "var(--card)",
                color: "var(--text)",
              }}
              disabled={posting}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={posting}
              />

              <div style={{ marginLeft: "auto" }}>
                <PillButton
                  onClick={submitPost}
                  disabled={
                    posting || !selectedCourse || (!draft.trim() && !file)
                  }
                >
                  {posting ? "Posting..." : "Post"}
                </PillButton>
              </div>
            </div>

            {preview && (
              <img
                src={preview}
                alt="preview"
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  maxWidth: "100%",
                  border: "1px solid var(--border)",
                }}
              />
            )}
          </div>
        </div>

        {/* ===== Posts ===== */}
        <div style={{ display: "grid", gap: 10 }}>
          {posts.length === 0 ? (
            <div style={{ color: "var(--sub)", fontSize: 13, padding: 6 }}>
              No posts yet.
            </div>
          ) : null}

          {posts.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                borderRadius: 14,
                background: "var(--muted)",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onClick={() => {
                const lat = Number(p.course.lat);
                const lon = Number(p.course.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                setSelectedCourse({
                  id: p.course.id,
                  name: p.course.name,
                  lat,
                  lon,
                });
              }}
              title="Select this post's course"
            >
              <div style={{ fontWeight: 900 }}>{p.course.name}</div>

              <a
                href={`/u/${p.user.handle}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nav(`/u/${encodeURIComponent(p.user.handle)}`);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  textDecoration: "underline",
                  color: "var(--text)",
                  display: "inline-block",
                  marginTop: 2,
                }}
                title="Open profile"
              >
                @{p.user.handle}
              </a>

              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {p.content}
              </div>

              {p.images?.[0]?.url && (
                <img
                  src={fileUrl(p.images[0].url)}
                  alt="post"
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    maxWidth: "100%",
                    border: "1px solid var(--border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
