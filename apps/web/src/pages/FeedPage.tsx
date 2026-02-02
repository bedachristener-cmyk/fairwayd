import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import type { Marker as LeafletMarker } from "leaflet";

import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { createPortal } from "react-dom";

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

const DEFAULT_CENTER = { lat: 47.5596, lon: 7.5886 }; // Basel (fallback)

const golfIcon = L.divIcon({
  className: "golf-marker",
  html: `
  <div style="
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #1f8a3b;
    box-shadow: 0 2px 10px rgba(0,0,0,.25);
    border: 2px solid white;
    position: relative;
  ">
    <div style="
      position:absolute;
      left: 9px;
      top: 4px;
      width: 2px;
      height: 16px;
      background: white;
      border-radius: 2px;
    "></div>
    <div style="
      position:absolute;
      left: 11px;
      top: 4px;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 7px solid white;
    "></div>
  </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        boxShadow: "0 2px 16px rgba(0,0,0,.06)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
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
        border: "1px solid rgba(0,0,0,.12)",
        background: disabled ? "rgba(0,0,0,.06)" : "#111",
        color: disabled ? "rgba(0,0,0,.55)" : "white",
        cursor: disabled ? "default" : "pointer",
        fontWeight: 800,
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function RecenterMap({
  lat,
  lon,
  zoom = 13,
}: {
  lat: number;
  lon: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 0.8 });
  }, [lat, lon, zoom, map]);
  return null;
}

function FitBounds({
  points,
  maxZoom = 10,
}: {
  points: Array<{ lat: number; lon: number }>;
  maxZoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [20, 20] });

    const z = map.getZoom();
    if (z > maxZoom) map.setZoom(maxZoom);
  }, [map, points, maxZoom]);

  return null;
}

export default function FeedPage() {
  const { selectedCourse, clearSelectedCourse, setSelectedCourse } =
    useSelectedCourse();

  // Responsive: desktop-only rail logic
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 900px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => setIsDesktop(mq.matches);

    // Safari compatibility
    if ("addEventListener" in mq) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    setIsDesktop(mq.matches);

    return () => {
      if ("removeEventListener" in mq)
        mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // Auth token (prefer AuthContext, fallback to legacy localStorage keys)
  const auth = useAuth() as any;
  const tokenFromContext: string =
    (auth?.token as string) ||
    (auth?.jwt as string) ||
    (auth?.accessToken as string) ||
    "";

  const tokenFromStorage =
    localStorage.getItem("token") ||
    localStorage.getItem("fairwayd_token") ||
    "";

  const token = tokenFromContext || tokenFromStorage;

  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [center, setCenter] = useState<{ lat: number; lon: number }>(
    DEFAULT_CENTER,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // composer
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">(
    "PUBLIC",
  );

  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Infinite scroll sentinel + guard against double-loads
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Optional: use browser geolocation to set initial center (Basel remains fallback)
  useEffect(() => {
    if (selectedCourse) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setCenter({ lat, lon });
        }
      },
      () => {
        // ignore (denied/unavailable)
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60_000 },
    );
  }, [selectedCourse]);

  // Load courses once (your /courses returns an array)
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await fetch(`${API_BASE}/courses`);
        if (!res.ok) return;
        const data = await res.json();
        const items: Course[] = Array.isArray(data) ? data : [];
        setCourses(items);
      } catch {
        // ignore
      }
    };
    loadCourses();
  }, []);

  // newest post per course (dedup markers)
  const newestPostByCourse = useMemo(() => {
    const map = new Map<string, Post>();
    for (const p of posts) {
      const existing = map.get(p.course.id);
      if (
        !existing ||
        new Date(p.createdAt).getTime() > new Date(existing.createdAt).getTime()
      ) {
        map.set(p.course.id, p);
      }
    }
    return Array.from(map.values());
  }, [posts]);

  // preview url for selected file
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Selected course marker (even if no posts exist yet)
  const selectedCourseMarker =
    selectedCourse?.id && selectedCourse.lat && selectedCourse.lon
      ? {
          course: {
            id: selectedCourse.id,
            name: selectedCourse.name ?? selectedCourse.id,
            lat: selectedCourse.lat,
            lon: selectedCourse.lon,
          },
          user: { handle: "" },
          content: "",
        }
      : null;

  // Marker source priority:
  // 1) selectedCourse marker + other post markers
  // 2) post markers (if feed has posts)
  // 3) course markers (fallback if no posts)
  const markers = selectedCourseMarker
    ? [
        selectedCourseMarker,
        ...newestPostByCourse.filter((p) => p.course.id !== selectedCourse?.id),
      ]
    : newestPostByCourse.length > 0
      ? newestPostByCourse
      : courses.map((c) => ({
          course: c,
          user: { handle: "" },
          content: "",
        }));

  const loadFeed = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setErr(null);

      try {
        const base = selectedCourse?.id
          ? `${API_BASE}/posts/course/${selectedCourse.id}`
          : `${API_BASE}/posts/feed`;

        const url = new URL(base);
        if (cursor) url.searchParams.set("cursor", cursor);

        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          );
        }

        const data = await res.json();
        const items: Post[] = Array.isArray(data?.items) ? data.items : [];

        // Only adjust center if no selectedCourse is active and we got items
        if (!cursor && items.length > 0 && !selectedCourse?.id) {
          setCenter({ lat: items[0].course.lat, lon: items[0].course.lon });
        }

        setPosts((prev) => (cursor ? [...prev, ...items] : items));
        setNextCursor(data?.nextCursor ?? null);
      } catch (e: any) {
        setErr(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [selectedCourse?.id, token],
  );

  // Reload feed when selectedCourse or token changes
  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    loadingMoreRef.current = false;
    loadFeed();
  }, [loadFeed]);

  // When selectedCourse changes, center map + open popup if marker exists
  useEffect(() => {
    if (selectedCourse?.lat && selectedCourse?.lon) {
      setCenter({ lat: selectedCourse.lat, lon: selectedCourse.lon });
      setTimeout(() => {
        const m = markerRefs.current[selectedCourse.id];
        m?.openPopup();
      }, 120);
    }
  }, [selectedCourse?.id, selectedCourse?.lat, selectedCourse?.lon]);

  // Auto-focus composer when course selected
  useEffect(() => {
    if (!selectedCourse) return;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);
  }, [selectedCourse?.id]);

  // Infinite scroll: when sentinel becomes visible, load next page
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;

        if (!nextCursor) return;
        if (loading) return;
        if (posting) return;
        if (loadingMoreRef.current) return;

        loadingMoreRef.current = true;

        loadFeed(nextCursor).finally(() => {
          loadingMoreRef.current = false;
        });
      },
      { root: null, threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loading, posting, loadFeed]);

  const focusCourse = (courseId: string) => {
    const p = posts.find((x) => x.course.id === courseId);
    if (!p) return;

    setCenter({ lat: p.course.lat, lon: p.course.lon });

    setTimeout(() => {
      const m = markerRefs.current[courseId];
      m?.openPopup();
    }, 120);
  };

  const submitPost = async () => {
    const text = draft.trim();

    if (!selectedCourse?.id) {
      setErr("Please select a course first (click a marker on the map).");
      return;
    }
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

    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourse.id);
      fd.append("content", text);
      fd.append("visibility", visibility);
      if (file) fd.append("image", file);

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`.trim());
      }

      setDraft("");
      setFile(null);
      setPreview(null);

      setPosts([]);
      setNextCursor(null);
      loadingMoreRef.current = false;
      await loadFeed();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  // ✅ Portal target in AppShell Right rail
  const rightRailSlot =
    typeof document !== "undefined"
      ? document.getElementById("right-rail-slot")
      : null;

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {/* ✅ Desktop: render MapCard into Right rail via Portal */}
      {isDesktop && rightRailSlot
        ? createPortal(
            <div style={{ position: "sticky", top: 12 }}>{MapCard}</div>,
            rightRailSlot,
          )
        : null}

      {/* FEED (Main column only — AppShell handles columns) */}
      {err && (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "#ffe8e8",
            border: "1px solid rgba(0,0,0,.08)",
            fontFamily: "system-ui",
            fontSize: 13,
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      )}

      <Card
        title="Feed"
        right={
          selectedCourse ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                Course: {selectedCourse.name ?? selectedCourse.id}
              </div>
              <PillButton
                onClick={() => {
                  clearSelectedCourse();
                  setCenter(DEFAULT_CENTER);
                }}
                disabled={loading || posting}
              >
                Clear
              </PillButton>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.65 }}>All posts</div>
          )
        }
      >
        {/* --- COMPOSE BOX --- */}
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(0,0,0,.03)",
            border: "1px solid rgba(0,0,0,.06)",
            marginBottom: 12,
          }}
        >
          {selectedCourse && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(0,0,0,.06)",
                border: "1px solid rgba(0,0,0,.1)",
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              ⛳ {selectedCourse.name}
              <button
                onClick={() => {
                  clearSelectedCourse();
                  setCenter(DEFAULT_CENTER);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 14,
                  opacity: 0.6,
                }}
                title="Clear course"
              >
                ✕
              </button>
            </div>
          )}

          {!selectedCourse && (
            <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.6 }}>
              Select a course on the map to post
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!selectedCourse || posting}
            placeholder={
              selectedCourse
                ? "What’s your golf moment?"
                : "Select a course on the map to post…"
            }
            rows={3}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,.12)",
              fontFamily: "system-ui",
              fontSize: 14,
              outline: "none",
              opacity: !selectedCourse ? 0.65 : 1,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={!selectedCourse || posting}
            />

            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "PUBLIC" | "FOLLOWERS")
              }
              disabled={!selectedCourse || posting}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,.12)",
                fontWeight: 700,
              }}
            >
              <option value="PUBLIC">PUBLIC</option>
              <option value="FOLLOWERS">FOLLOWERS</option>
            </select>

            <div style={{ marginLeft: "auto" }}>
              <PillButton
                onClick={submitPost}
                disabled={posting || loading || !selectedCourse}
              >
                {posting ? "Posting..." : "Post"}
              </PillButton>
            </div>
          </div>

          {preview && (
            <div style={{ marginTop: 10 }}>
              <img
                src={preview}
                alt="preview"
                style={{
                  maxWidth: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.08)",
                }}
              />
            </div>
          )}
        </div>

        {/* --- POSTS --- */}
        <div style={{ display: "grid", gap: 10 }}>
          {!loading && posts.length === 0 && (
            <div style={{ padding: 12, opacity: 0.7 }}>
              No posts yet — pick a course and create the first one.
            </div>
          )}

          {posts.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(0,0,0,.04)",
                border: "1px solid rgba(0,0,0,.06)",
                cursor: "pointer",
              }}
              onClick={() => {
                setSelectedCourse({
                  id: p.course.id,
                  name: p.course.name,
                  lat: p.course.lat,
                  lon: p.course.lon,
                });
                focusCourse(p.course.id);
              }}
              title="Zoom map to this course"
            >
              <div style={{ fontWeight: 900 }}>{p.course.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>@{p.user.handle}</div>
              <div style={{ marginTop: 6 }}>{p.content}</div>

              {p.images?.[0]?.url && (
                <img
                  src={`${API_BASE}${p.images[0].url}`}
                  alt="post"
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    maxWidth: "100%",
                  }}
                />
              )}
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} style={{ height: 24 }} />
          {nextCursor && (
            <div style={{ textAlign: "center", opacity: 0.6, fontSize: 12 }}>
              {loading ? "Loading more..." : "Scroll to load more"}
            </div>
          )}
        </div>
      </Card>

      {/* MOBILE: Map appears below feed (optional) */}
    </div>
  );
}
