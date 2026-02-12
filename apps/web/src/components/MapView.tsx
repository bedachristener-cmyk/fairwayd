import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import { useNavigate } from "react-router-dom";
import L from "leaflet";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const courseIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:44px;
      height:44px;
      border-radius:999px;
      background:magenta;
      border:4px solid yellow;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:22px;
      font-weight:900;
    ">TEST</div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const meIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:14px;
      height:14px;
      border-radius:999px;
      background:rgba(80,160,255,.95);
      border:2px solid rgba(0,0,0,.65);
      box-shadow:0 6px 18px rgba(80,160,255,.35);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type CourseLite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  region?: string | null;
};

async function apiGetFollowing(courseId: string, token: string) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/following`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET following failed ${res.status}`);
  return (await res.json()) as { following: boolean };
}

async function apiFollow(courseId: string, token: string) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`POST follow failed ${res.status}`);
  return (await res.json()) as { ok: boolean };
}

async function apiUnfollow(courseId: string, token: string) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE follow failed ${res.status}`);
  return (await res.json()) as { ok: boolean };
}

function CoursesByBoundsLoader({
  onStatus,
  onItems,
}: {
  onStatus: (s: string) => void;
  onItems: (items: CourseLite[]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();

        const qs = new URLSearchParams({
          minLat: String(sw.lat),
          maxLat: String(ne.lat),
          minLon: String(sw.lng),
          maxLon: String(ne.lng),
          take: "1500",
        });

        onStatus("Loading courses...");
        const res = await fetch(
          `${API_BASE}/courses/in-bounds?${qs.toString()}`,
        );
        const data = await res.json();

        const items: CourseLite[] = Array.isArray(data?.items)
          ? data.items
          : [];
        if (!alive) return;

        onItems(items);
        onStatus(`${items.length} courses in view`);
      } catch {
        if (!alive) return;
        onStatus("Failed to load courses");
      }
    };

    load();
    map.on("moveend", load);
    map.on("zoomend", load);

    return () => {
      alive = false;
      map.off("moveend", load);
      map.off("zoomend", load);
    };
  }, [map, onItems, onStatus]);

  return null;
}

export default function MapView() {
  const { setSelectedCourse } = useSelectedCourse();
  const nav = useNavigate();

  const [center, setCenter] = useState<[number, number]>([47.5596, 7.5886]);
  const [radiusM] = useState(50000);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loadStatus, setLoadStatus] = useState("Loading courses...");

  // Follow UI state
  const token = localStorage.getItem("fairwayd_token") || "";
  const [followingByCourseId, setFollowingByCourseId] = useState<
    Record<string, boolean>
  >({});
  const [busyByCourseId, setBusyByCourseId] = useState<Record<string, boolean>>(
    {},
  );
  const [loadingFollowByCourseId, setLoadingFollowByCourseId] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
    );
  }, []);

  const status = useMemo(() => loadStatus, [loadStatus]);

  const onSelectCourse = useCallback(
    (c: CourseLite) => {
      setSelectedCourse({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lon: c.lon,
      });

      setTimeout(() => nav("/feed"), 50);
    },
    [setSelectedCourse, nav],
  );

  const ensureFollowingLoaded = useCallback(
    async (courseId: string) => {
      if (!token) return;

      if (followingByCourseId[courseId] !== undefined) return;
      if (loadingFollowByCourseId[courseId]) return;

      setLoadingFollowByCourseId((m) => ({ ...m, [courseId]: true }));

      try {
        const data = await apiGetFollowing(courseId, token);
        setFollowingByCourseId((m) => ({ ...m, [courseId]: data.following }));
      } catch {
        // wenn Request fehlschlägt, setze bewusst false (nicht undefined)
        setFollowingByCourseId((m) => ({ ...m, [courseId]: false }));
      } finally {
        setLoadingFollowByCourseId((m) => ({ ...m, [courseId]: false }));
      }
    },
    [token, followingByCourseId, loadingFollowByCourseId],
  );

  const toggleFollow = useCallback(
    async (courseId: string) => {
      if (!token) return;

      const current = !!followingByCourseId[courseId];
      setBusyByCourseId((m) => ({ ...m, [courseId]: true }));

      // optimistic
      setFollowingByCourseId((m) => ({ ...m, [courseId]: !current }));

      try {
        if (current) {
          await apiUnfollow(courseId, token);
        } else {
          await apiFollow(courseId, token);
        }
      } catch {
        // revert on error
        setFollowingByCourseId((m) => ({ ...m, [courseId]: current }));
      } finally {
        setBusyByCourseId((m) => ({ ...m, [courseId]: false }));
      }
    },
    [token, followingByCourseId],
  );

  return (
    <div style={{ height: "100vh" }}>
      <div style={{ padding: 8, color: "var(--text)" }}>{status}</div>

      <MapContainer center={center} zoom={11} style={{ height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Circle center={center} radius={radiusM} />

        <Marker position={center} icon={meIcon}>
          <Popup>You are here</Popup>
        </Marker>

        <CoursesByBoundsLoader onStatus={setLoadStatus} onItems={setCourses} />

        {courses.map((c) => {
          const following = followingByCourseId[c.id];
          const busy = !!busyByCourseId[c.id];
          const loading = !!loadingFollowByCourseId[c.id];

          return (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={courseIcon}
              eventHandlers={{
                click: () => ensureFollowingLoaded(c.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => onSelectCourse(c)}
                    title="Open feed for this course"
                  >
                    {c.name}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      disabled={!token || busy || loading}
                      onClick={() => toggleFollow(c.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: following ? "black" : "white",
                        color: following ? "white" : "black",
                        cursor: !token ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        opacity: loading ? 0.7 : 1,
                      }}
                    >
                      {loading
                        ? "Loading..."
                        : following
                          ? "Following"
                          : "+ Follow"}
                    </button>

                    {!token ? (
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          alignSelf: "center",
                        }}
                      >
                        Login nötig
                      </span>
                    ) : null}
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
