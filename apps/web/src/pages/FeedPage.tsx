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

// ====== SMALL UI HELPERS ======

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

// ====== MODAL (Desktop centered / Mobile Drawer) ======
// (bleibt drin, wird aber nicht mehr verwendet)

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 700px)");
    const apply = () => setIsMobile(mq.matches);

    apply();
    if ("addEventListener" in mq) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    setTimeout(() => panelRef.current?.focus(), 30);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxHeight: "78vh",
        overflow: "auto",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        outline: "none",
      }
    : {
        width: "min(700px, 95vw)",
        maxHeight: "80vh",
        overflow: "auto",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 16,
        outline: "none",
      };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 100,
        display: isMobile ? "block" : "grid",
        placeItems: isMobile ? undefined : "center",
        padding: isMobile ? 0 : 14,
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        style={panelStyle}
      >
        {isMobile ? (
          <div
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              background: "rgba(255,255,255,.22)",
              margin: "0 auto 12px",
            }}
          />
        ) : null}

        {children}
      </div>
    </div>
  );
}

// ====== MAIN COMPONENT ======

export default function FeedPage() {
  const nav = useNavigate();
  const { selectedCourse, setSelectedCourse, clearSelectedCourse } =
    useSelectedCourse();

  const auth = useAuth() as any;
  const token =
    (auth?.token as string) ||
    localStorage.getItem("fairwayd_token") ||
    localStorage.getItem("token") ||
    "";

  const handle = localStorage.getItem("fairwayd_handle") || "me";

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

  // ====== LOAD COURSES (robust) ======
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

  // ====== IMAGE PREVIEW ======
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ====== LOAD FEED (robust) ======
  const loadFeed = useCallback(async () => {
    try {
      setErr(null);

      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(`${API_BASE}/posts/feed`, { headers });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      const data = await res.json();
      setPosts(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load feed");
    }
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!selectedCourse) return;

    const t = window.setTimeout(() => {
      draftRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(t);
  }, [selectedCourse]);

  // ====== POST (optimistic + replace with server response) ======
  const submitPost = async () => {
    if (!selectedCourse) {
      setErr("Choose a course first.");
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
      course: {
        id: selectedCourse.id,
        name: selectedCourse.name,
        lat: selectedCourse.lat,
        lon: selectedCourse.lon,
      },
      user: {
        id: "me",
        handle,
      },
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

  // ====== COURSES FOR DROPDOWN ======
  const coursesLite: CourseLite[] = useMemo(
    () => courses.map((c) => ({ id: c.id, name: c.name })),
    [courses],
  );

  return (
    <>
      {/* ===== FEED UI ===== */}
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
          {/* ===== COMPOSER ===== */}
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              background: "var(--muted)",
              border: "1px solid var(--border)",
              marginBottom: 12,
            }}
          >
            {/* Course Row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Dropdown under the chip */}
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

                {/* Optional tiny hint if no course */}
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

          {/* ===== POSTS ===== */}
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
                onClick={() =>
                  setSelectedCourse({
                    id: p.course.id,
                    name: p.course.name,
                    lat: p.course.lat,
                    lon: p.course.lon,
                  })
                }
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
                    src={
                      p.images[0].url.startsWith("blob:") ||
                      p.images[0].url.startsWith("http")
                        ? p.images[0].url
                        : `${API_BASE}${p.images[0].url}`
                    }
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
    </>
  );
}
