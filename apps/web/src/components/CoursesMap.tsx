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
import CoursePopupActions from "./CoursePopupActions";
import { useSelectedCourse } from "../state/SelectedCourseContext";

type Course = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
};

type Geo = { lat: number; lon: number };

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
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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

export default function CoursesMap() {
  const userPos = useGeolocation();
  const location = useLocation();
  const nav = useNavigate();

  const { token, isAuthenticated } = useAuth();
  const { setSelectedCourse } = useSelectedCourse();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"map" | "satellite">("map");

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
  const tileUrl =
    mapStyle === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const tileAttribution =
    mapStyle === "satellite"
      ? "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      : "&copy; OpenStreetMap contributors &copy; CARTO";
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const stopBtn = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const center = useMemo<[number, number]>(() => {
    const lat = toFiniteNumber(userPos?.lat);
    const lon = toFiniteNumber(userPos?.lon);
    return lat !== null && lon !== null ? [lat, lon] : [47.5596, 7.5886];
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
      const posts = await apiGet<Post[]>(`/posts/course/${courseId}`, {
        token,
      });
      setPostsByCourse((m) => ({
        ...m,
        [courseId]: Array.isArray(posts) ? posts : [],
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
          gap: 8,
          background: "rgba(255,255,255,0.92)",
          padding: 6,
          borderRadius: 999,
          boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        }}
      >
        <button
          onClick={() => setMapStyle("map")}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 700,
            background: mapStyle === "map" ? "#1f8a3b" : "transparent",
            color: mapStyle === "map" ? "white" : "#111",
          }}
        >
          Map
        </button>

        <button
          onClick={() => setMapStyle("satellite")}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 700,
            background: mapStyle === "satellite" ? "#1f8a3b" : "transparent",
            color: mapStyle === "satellite" ? "white" : "#111",
          }}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        key={mapStyle}
        center={center}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} />

        <FixLeafletSize />

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

          // ✅ Wichtig: Marker mit NaN/NaN darf NIE gerendert werden (Leaflet crasht sonst)
          if (lat === null || lon === null) {
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
                  nav("/feed");
                },
                popupopen: () => {
                  loadPostsForCourse(c.id, false);
                },
              }}
            >
              <Popup>
                <strong>{c.name}</strong>
                <br />
                {[c.city, c.region, c.country].filter(Boolean).join(", ")}
                <br />
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  lat: {String(c.lat)} | lon: {String(c.lon)}
                </span>

                <CoursePopupActions courseId={c.id} />

                {isAuthenticated && (
                  <div style={{ marginTop: 8 }}>
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
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                      title="Create a post for this course"
                    >
                      Post here
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 10, width: 260 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Posts</div>

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
                          padding: "2px 6px",
                          cursor: busy ? "default" : "pointer",
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

                  {isAuthenticated && busy && (
                    <div style={{ fontSize: 12 }}>Loading posts...</div>
                  )}

                  {isAuthenticated && err && (
                    <div style={{ fontSize: 12, color: "crimson" }}>{err}</div>
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
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {p.content}
                        </div>
                        <div style={{ opacity: 0.65, marginTop: 4 }}>
                          {p.user?.handle ? `@${p.user.handle} • ` : ""}
                          {p.visibility} • {formatWhen(p.createdAt)}
                          {p._count
                            ? ` • ♥ ${p._count.likes} • 💬 ${p._count.comments}`
                            : ""}
                        </div>
                      </div>
                    ))}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
