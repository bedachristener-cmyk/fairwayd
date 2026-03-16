import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { useAuth } from "../auth/AuthContext";
import { apiGet } from "../api/client";
import { useCourseFollow } from "../hooks/useCourseFollow";
import { useSelectedCourse } from "../state/SelectedCourseContext";

type Course = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;
  par?: number | null;
  lat: number;
  lon: number;
};

type Geo = { lat: number; lon: number };

type PostImage = {
  id: string;
  url: string;
};

type Post = {
  id: string;
  userId: string;
  courseId: string;
  content: string;
  visibility: "FOLLOWERS" | "PUBLIC";
  createdAt: string;
  user?: {
    id: string;
    handle: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
  images?: PostImage[];
};

type CoursePostsResponse = {
  items?: Post[];
  nextCursor?: string | null;
  take?: number;
};

const golfIcon = L.divIcon({
  className: "golf-marker",
  html: `
  <div style="
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #1f8a3b;
    box-shadow: 0 2px 8px rgba(0,0,0,.25);
    border: 2px solid white;
    position: relative;
    box-sizing: border-box;
  ">
    <div style="
      position: absolute;
      left: 5px;
      top: 2px;
      width: 2px;
      height: 11px;
      background: white;
      border-radius: 2px;
    "></div>
    <div style="
      position: absolute;
      left: 7px;
      top: 2px;
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 5px solid yellow;
    "></div>
  </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function useGeolocation() {
  const [pos, setPos] = useState<Geo | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  return pos;
}

function FixLeafletSize() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [map]);

  return null;
}
function PersistMapView() {
  const map = useMap();

  useEffect(() => {
    const save = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      localStorage.setItem(
        "fairwayd-map-view",
        JSON.stringify({
          lat: center.lat,
          lon: center.lng,
          zoom,
        }),
      );
    };

    map.on("moveend", save);
    map.on("zoomend", save);

    save();

    return () => {
      map.off("moveend", save);
      map.off("zoomend", save);
    };
  }, [map]);

  return null;
}

function FitToData({
  userPos,
  courses,
  locked,
}: {
  userPos: Geo | null;
  courses: Course[];
  locked: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (locked) return;

    if (userPos) {
      const lat = toFiniteNumber(userPos.lat);
      const lon = toFiniteNumber(userPos.lon);
      if (!Number.isFinite(lat as number) || !Number.isFinite(lon as number)) {
        console.warn("FitToData skip setView invalid userPos", userPos);
        return;
      }
      map.setView([lat as number, lon as number], 10);
      return;
    }

    if (courses.length > 0) {
      const first = courses[0];
      const lat = toFiniteNumber(first?.lat);
      const lon = toFiniteNumber(first?.lon);

      if (!Number.isFinite(lat as number) || !Number.isFinite(lon as number)) {
        console.warn(
          "FitToData skip setView invalid first course coords",
          first,
        );
        return;
      }

      map.setView([lat as number, lon as number], 8);
    }
  }, [userPos, courses, map, locked]);

  return null;
}

function ZoomToCourse({
  courseId,
  courses,
  markerRefs,
  onOpenCourse,
}: {
  courseId: string | null;
  courses: Course[];
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
  onOpenCourse: (courseId: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!courseId) return;
    if (!courses || courses.length === 0) return;

    const c = courses.find((x) => x.id === courseId);
    if (!c) return;

    const lat = toFiniteNumber(c.lat);
    const lon = toFiniteNumber(c.lon);
    console.log("COURSE DEBUG", c.name, "lat=", c.lat, "lon=", c.lon);

    if (!Number.isFinite(lat as number) || !Number.isFinite(lon as number)) {
      console.warn("ZoomToCourse skip setView invalid course coords", c);
      return;
    }

    map.setView([lat as number, lon as number], 14, { animate: true });

    onOpenCourse(courseId);

    setTimeout(() => {
      const m = markerRefs.current[courseId];
      if (m) m.openPopup();

      const url = new URL(window.location.href);
      url.searchParams.delete("courseId");
      window.history.replaceState({}, "", url.pathname + url.search);
    }, 150);
  }, [courseId, courses, map, markerRefs, onOpenCourse]);

  return null;
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;

    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}
function normalizeWebsite(url?: string | null) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function LoggedInBadge({ isLoggedIn }: { isLoggedIn: boolean }) {
  const handle = localStorage.getItem("fairwayd_handle") ?? "";
  if (!isLoggedIn) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
        background: "white",
        padding: "8px 10px",
        borderRadius: 999,
        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        fontFamily: "system-ui",
        fontSize: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span style={{ fontWeight: 800 }}>Logged in</span>
      <span style={{ opacity: 0.8 }}>{handle ? `@${handle}` : ""}</span>
    </div>
  );
}

function CourseFollowButton({ courseId }: { courseId: string }) {
  const { token, isFollowing, followBusy, toggleFollow } =
    useCourseFollow(courseId);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow();
      }}
      disabled={followBusy || !token}
      title={!token ? "Please login" : "Follow course"}
      style={{
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: isFollowing ? "rgba(31,138,59,0.12)" : "var(--muted)",
        color: "var(--text)",
        fontWeight: 800,
        cursor: !token ? "not-allowed" : followBusy ? "default" : "pointer",
        opacity: !token ? 0.6 : 1,
      }}
    >
      {followBusy ? "..." : isFollowing ? "✓ Following" : "+ Follow"}
    </button>
  );
}

export default function CoursesMap() {
  const userPos = useGeolocation();
  const location = useLocation();
  const nav = useNavigate();

  const { token, isAuthenticated } = useAuth();
  const { setSelectedCourse } = useSelectedCourse();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"map" | "satellite">(() => {
    const saved = localStorage.getItem("fairwayd-map-style");
    return saved === "satellite" ? "satellite" : "map";
  });
  useEffect(() => {
    localStorage.setItem("fairwayd-map-style", mapStyle);
  }, [mapStyle]);

  const [postsByCourse, setPostsByCourse] = useState<Record<string, Post[]>>(
    {},
  );
  const [busyByCourse, setBusyByCourse] = useState<Record<string, boolean>>({});
  const [errByCourse, setErrByCourse] = useState<Record<string, string | null>>(
    {},
  );

  const courseIdFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("courseId");
  }, [location.search]);
  const mapTileUrl =
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const mapTileAttribution = "&copy; OpenStreetMap contributors &copy; CARTO";

  const satelliteTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const satelliteLabelsUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

  const satelliteTileAttribution =
    "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const stopBtn = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const center = useMemo<[number, number]>(() => {
    // 1️⃣ zuerst letzte gespeicherte Map Position
    try {
      const saved = localStorage.getItem("fairwayd-map-view");
      if (saved) {
        const parsed = JSON.parse(saved);
        const sLat = toFiniteNumber(parsed?.lat);
        const sLon = toFiniteNumber(parsed?.lon);

        if (sLat !== null && sLon !== null) {
          return [sLat, sLon];
        }
      }
    } catch {}

    // 2️⃣ sonst aktueller Standort
    const lat = toFiniteNumber(userPos?.lat);
    const lon = toFiniteNumber(userPos?.lon);

    if (lat !== null && lon !== null) {
      return [lat, lon];
    }

    // 3️⃣ neutraler Fallback
    return [20, 0];
  }, [userPos]);
  useEffect(() => {
    apiGet<Course[]>("/courses")
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
        else setLoadError("GET /courses returned non-array JSON");
      })
      .catch((e: any) => setLoadError(e?.message ?? String(e)));
  }, []);

  const loadPostsForCourse = async (courseId: string, force = false) => {
    if (!courseId) return;

    if (!force && postsByCourse[courseId]) return;

    if (!isAuthenticated || !token) {
      setErrByCourse((m) => ({ ...m, [courseId]: "Login to see posts." }));
      return;
    }

    setBusyByCourse((m) => ({ ...m, [courseId]: true }));
    setErrByCourse((m) => ({ ...m, [courseId]: null }));

    try {
      const res = await apiGet<CoursePostsResponse>(
        `/posts/course/${courseId}`,
        {
          token,
        },
      );

      const items = Array.isArray(res?.items) ? res.items : [];

      setPostsByCourse((m) => ({
        ...m,
        [courseId]: items,
      }));
    } catch (e: any) {
      setErrByCourse((m) => ({ ...m, [courseId]: e?.message ?? String(e) }));
      setPostsByCourse((m) => ({ ...m, [courseId]: [] }));
    } finally {
      setBusyByCourse((m) => ({ ...m, [courseId]: false }));
    }
  };

  const postsForCourse = (courseId: string) => {
    const list = postsByCourse[courseId] ?? [];
    return list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  };

  if (loadError) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Failed to load courses
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <LoggedInBadge isLoggedIn={isAuthenticated} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          gap: 6,
          background: "rgba(255,255,255,0.94)",
          padding: 6,
          borderRadius: 999,
          boxShadow: "0 2px 12px rgba(0,0,0,.15)",
          border: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          type="button"
          onClick={() => setMapStyle("map")}
          aria-pressed={mapStyle === "map"}
          title="Standard map"
          style={{
            border:
              mapStyle === "map"
                ? "1px solid #1f8a3b"
                : "1px solid transparent",
            borderRadius: 999,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 700,
            background: mapStyle === "map" ? "#1f8a3b" : "transparent",
            color: mapStyle === "map" ? "white" : "#111",
            minWidth: 72,
            transition: "all 0.15s ease",
          }}
        >
          Map
        </button>

        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          aria-pressed={mapStyle === "satellite"}
          title="Satellite hybrid"
          style={{
            border:
              mapStyle === "satellite"
                ? "1px solid #1f8a3b"
                : "1px solid transparent",
            borderRadius: 999,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 700,
            background: mapStyle === "satellite" ? "#1f8a3b" : "transparent",
            color: mapStyle === "satellite" ? "white" : "#111",
            minWidth: 92,
            transition: "all 0.15s ease",
          }}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
      >
        {mapStyle === "map" ? (
          <TileLayer attribution={mapTileAttribution} url={mapTileUrl} />
        ) : (
          <>
            <TileLayer
              attribution={satelliteTileAttribution}
              url={satelliteTileUrl}
            />
            <TileLayer
              attribution={satelliteTileAttribution}
              url={satelliteLabelsUrl}
            />
          </>
        )}

        <FixLeafletSize />
        <PersistMapView />

        <FitToData
          userPos={userPos}
          courses={courses}
          locked={!!courseIdFromUrl}
        />

        <FitToData
          userPos={userPos}
          courses={courses}
          locked={!!courseIdFromUrl}
        />

        <ZoomToCourse
          courseId={courseIdFromUrl}
          courses={courses}
          markerRefs={markerRefs}
          onOpenCourse={(id) => loadPostsForCourse(id, false)}
        />

        {userPos &&
          Number.isFinite(userPos.lat) &&
          Number.isFinite(userPos.lon) && (
            <CircleMarker center={[userPos.lat, userPos.lon]} radius={8}>
              <Popup>Your location</Popup>
            </CircleMarker>
          )}

        {courses.map((c) => {
          const lat = toFiniteNumber(c.lat);
          const lon = toFiniteNumber(c.lon);

          if (
            lat == null ||
            lon == null ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
          ) {
            return null;
          }

          if (
            lat == null ||
            lon == null ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
          ) {
            return null;
          }

          const busy = !!busyByCourse[c.id];
          const err = errByCourse[c.id];
          const loaded = postsByCourse[c.id] !== undefined;
          const list = postsForCourse(c.id);

          return (
            <Marker
              key={c.id}
              position={[lat, lon]}
              icon={golfIcon}
              ref={(r) => {
                markerRefs.current[c.id] = (r as any) ?? null;
              }}
              eventHandlers={{
                click: () => {
                  setSelectedCourse({
                    id: c.id,
                    name: c.name,
                    lat,
                    lon,
                  });
                  loadPostsForCourse(c.id, false);
                },
                popupopen: () => {
                  loadPostsForCourse(c.id, false);
                },
              }}
            >
              <Popup>
                <div
                  style={{
                    width: 300,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    color: "var(--text)",
                    fontFamily: "system-ui",
                  }}
                >
                  {/* COURSE INFO CARD */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* HEADER */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--muted)",
                          border: "1px solid var(--border)",
                          flexShrink: 0,
                          fontSize: 16,
                        }}
                      >
                        ⛳
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            lineHeight: 1.25,
                            marginBottom: 4,
                          }}
                        >
                          {c.name}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--sub)",
                            lineHeight: 1.4,
                          }}
                        >
                          {[c.city, c.region, c.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      </div>
                    </div>

                    {/* COURSE META */}
                    {(c.holes || c.par) && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        {c.holes && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "var(--muted)",
                              border: "1px solid var(--border)",
                              fontSize: 12,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            🏌️ {c.holes} holes
                          </span>
                        )}

                        {c.par && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: "var(--muted)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            Par {c.par}
                          </span>
                        )}
                      </div>
                    )}

                    {/* WEBSITE */}
                    {normalizeWebsite(c.website) && (
                      <div
                        style={{
                          marginBottom: 10,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "var(--muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <a
                          href={normalizeWebsite(c.website)!}
                          target="_blank"
                          rel="noreferrer"
                          onMouseDown={stopBtn}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
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

                    {/* ACTIONS */}
                    <div
                      style={{
                        marginTop: 2,
                        paddingTop: 10,
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {isAuthenticated && (
                        <CourseFollowButton courseId={c.id} />
                      )}
                    </div>
                  </div>

                  {/* POST HERE BUTTON */}
                  {isAuthenticated && (
                    <button
                      onMouseDown={stopBtn}
                      onClick={(e) => {
                        stopBtn(e);
                        setSelectedCourse({
                          id: c.id,
                          name: c.name,
                          lat,
                          lon,
                        });
                        nav("/feed");
                      }}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--muted)",
                        color: "var(--text)",
                        fontWeight: 700,
                      }}
                      title="Create a post for this course"
                    >
                      Post here
                    </button>
                  )}

                  {/* POSTS CARD */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Posts
                      </div>

                      {isAuthenticated && (
                        <button
                          onMouseDown={stopBtn}
                          onClick={(e) => {
                            stopBtn(e);
                            loadPostsForCourse(c.id, true);
                          }}
                          disabled={busy}
                          title="Reload posts for this course"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            cursor: busy ? "default" : "pointer",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--muted)",
                            fontWeight: 700,
                          }}
                        >
                          {busy ? "..." : "Reload"}
                        </button>
                      )}
                    </div>

                    {!isAuthenticated && (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Login to see posts.
                      </div>
                    )}

                    {isAuthenticated && (
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                          marginBottom: 8,
                          padding: "6px 8px",
                          borderRadius: 8,
                          background: "var(--muted)",
                          border: "1px solid var(--border)",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      ></div>
                    )}

                    {isAuthenticated && busy && (
                      <div style={{ fontSize: 12 }}>Loading posts...</div>
                    )}

                    {isAuthenticated && err && (
                      <div style={{ fontSize: 12, color: "crimson" }}>
                        {err}
                      </div>
                    )}

                    {isAuthenticated &&
                      loaded &&
                      list.length === 0 &&
                      !busy &&
                      !err && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          No posts yet.
                        </div>
                      )}

                    {isAuthenticated &&
                      loaded &&
                      list.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(0,0,0,0.08)",
                            fontSize: 12,
                          }}
                        >
                          {p.content && (
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {p.content}
                            </div>
                          )}

                          {p.images && p.images.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                marginTop: 8,
                              }}
                            >
                              {p.images.slice(0, 3).map((img) => (
                                <img
                                  key={img.id}
                                  src={img.url}
                                  alt=""
                                  style={{
                                    width: 160,
                                    height: 110,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    border: "1px solid var(--border)",
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          <div
                            style={{
                              opacity: 0.7,
                              marginTop: 6,
                              fontSize: 11,
                              color: "var(--sub)",
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            {p.user?.handle && <span>@{p.user.handle}</span>}

                            <span>·</span>

                            <span>{formatWhen(p.createdAt)}</span>

                            {p._count && (
                              <>
                                <span>·</span>
                                <span>♥ {p._count?.likes ?? 0}</span>
                                <span>💬 {p._count?.comments ?? 0}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
