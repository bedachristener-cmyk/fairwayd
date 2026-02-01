import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

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

const DEFAULT_CENTER = { lat: 47.5596, lon: 7.5886 }; // Basel

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
    map.setView([lat, lon], zoom);
  }, [lat, lon, zoom, map]);
  return null;
}

export default function FeedPage() {
  const { selectedCourse, clearSelectedCourse, setSelectedCourse } =
    useSelectedCourse();

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

  // When selectedCourse has lat/lon (coming from CoursesMap), center small map
  useEffect(() => {
    if (selectedCourse?.lat && selectedCourse?.lon) {
      setCenter({ lat: selectedCourse.lat, lon: selectedCourse.lon });
      setTimeout(() => {
        const m = markerRefs.current[selectedCourse.id];
        m?.openPopup();
      }, 80);
    }
  }, [selectedCourse?.id, selectedCourse?.lat, selectedCourse?.lon]);

  // Auto-focus composer when course selected
  useEffect(() => {
    if (!selectedCourse) return;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);
  }, [selectedCourse?.id]);

  const loadFeed = async (cursor?: string) => {
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
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = await res.json();
      const items: Post[] = Array.isArray(data?.items) ? data.items : [];

      if (
        !cursor &&
        items.length > 0 &&
        !(selectedCourse?.lat && selectedCourse?.lon)
      ) {
        setCenter({ lat: items[0].course.lat, lon: items[0].course.lon });
      }

      setPosts((prev) => (cursor ? [...prev, ...items] : items));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse?.id, token]);

  const focusCourse = (courseId: string) => {
    const p = posts.find((x) => x.course.id === courseId);
    if (!p) return;

    setCenter({ lat: p.course.lat, lon: p.course.lon });

    setTimeout(() => {
      const m = markerRefs.current[courseId];
      m?.openPopup();
    }, 80);
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
      await loadFeed();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  // markers in small map:
  // - Always show selectedCourse marker (even if no posts exist yet)
  // - Plus newest post markers for other courses
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

  const markers = [
    ...(selectedCourseMarker ? [selectedCourseMarker] : []),
    ...newestPostByCourse.filter((p) => p.course.id !== selectedCourse?.id),
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
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
          <div style={{ marginTop: 6, opacity: 0.75 }}>API: {API_BASE}</div>
        </div>
      )}

      <Card
        title="Map"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.65 }}>API {API_BASE}</span>
            <PillButton
              onClick={() => loadFeed()}
              disabled={loading || posting}
            >
              {loading ? "Loading..." : "Reload"}
            </PillButton>
          </div>
        }
      >
        <div style={{ height: 320, borderRadius: 14, overflow: "hidden" }}>
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RecenterMap lat={center.lat} lon={center.lon} zoom={13} />

            {markers.map((p: any) => (
              <Marker
                key={p.course.id}
                position={[p.course.lat, p.course.lon]}
                icon={golfIcon}
                ref={(ref) => {
                  markerRefs.current[p.course.id] = (ref as any) ?? null;
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedCourse({
                      id: p.course.id,
                      name: p.course.name,
                      lat: p.course.lat,
                      lon: p.course.lon,
                    });
                    setCenter({ lat: p.course.lat, lon: p.course.lon });
                    setTimeout(
                      () => markerRefs.current[p.course.id]?.openPopup(),
                      60,
                    );
                  },
                }}
              >
                <Popup>
                  <strong>{p.course.name}</strong>
                  {p.content ? (
                    <>
                      <br />
                      Latest post: @{p.user.handle}
                      <br />
                      {p.content}
                    </>
                  ) : (
                    <>
                      <br />
                      No posts yet.
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          Tipp: Klick einen Marker → setzt den Course Filter.
        </div>
      </Card>

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
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(0,0,0,.03)",
            border: "1px solid rgba(0,0,0,.06)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            {selectedCourse ? "Create post" : "Select a course to post"}
          </div>

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
              disabled={posting || !selectedCourse}
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
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Preview
              </div>
              <img
                src={preview}
                alt="preview"
                style={{
                  maxWidth: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,.08)",
                }}
              />
              <div style={{ marginTop: 6 }}>
                <PillButton onClick={() => setFile(null)} disabled={posting}>
                  Remove photo
                </PillButton>
              </div>
            </div>
          )}
        </div>

        {posts.length === 0 && !loading && (
          <div style={{ fontSize: 13, opacity: 0.75 }}>No posts yet.</div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
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
              title="Filter + Zoom to course"
            >
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>{p.course.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  @{p.user.handle}
                </div>
                <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ marginTop: 6, fontSize: 14 }}>{p.content}</div>

              {p.images?.[0]?.url && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={`${API_BASE}${p.images[0].url}`}
                    alt="post"
                    style={{
                      maxWidth: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,.08)",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {nextCursor && (
          <div style={{ marginTop: 12 }}>
            <PillButton
              onClick={() => loadFeed(nextCursor)}
              disabled={loading || posting}
            >
              {loading ? "Loading..." : "Load more"}
            </PillButton>
          </div>
        )}
      </Card>
    </div>
  );
}
