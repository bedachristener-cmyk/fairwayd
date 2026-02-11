import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { API_BASE } from "../api/base";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import { useAuth } from "../auth/AuthContext";

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;

  city?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;
  access?: string | null;
};

const DEFAULT_CENTER = { lat: 47.5596, lon: 7.5886 };

const golfIcon = L.divIcon({
  className: "",
  html: `
    <div style="
    width:18px;
    height:18px;
    border-radius:999px;
    background:rgba(0,255,128,.95);
    border:2px solid rgba(01, 15, 15, 0.65);
    box-shadow:0 6px 18px rgba(0,255,128,.35);
    position:relative;
  ">
    <div style="
      position:absolute;
      left:7px;
      top:3px;
      width:2px;
      height:10px;
      background:black;
    "></div>
    <div style="
      position:absolute;
      left:9px;
      top:3px;
      width:6px;
      height:5px;
      background:red;
      clip-path: polygon(0 0, 100% 50%, 0 100%);
    "></div>
  </div>
`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

function RecenterMap({
  lat,
  lon,
  zoom = 12,
}: {
  lat: number;
  lon: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 0.6 });
  }, [lat, lon, zoom, map]);
  return null;
}

function CourseBadge() {
  return (
    <span
      title="Course"
      style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,255,128,.95)",
        border: "2px solid rgba(01, 15, 15, 0.65)",
        boxShadow: "0 6px 18px rgba(0,255,128,.35)",
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 7,
          top: 3,
          width: 2,
          height: 10,
          background: "black",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 9,
          top: 3,
          width: 6,
          height: 5,
          background: "red",
          clipPath: "polygon(0 0, 100% 50%, 0 100%)",
        }}
      />
    </span>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 13 }}>
      <div style={{ width: 84, color: "var(--sub)", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ color: "var(--text)", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function AccessBadge({ access }: { access?: string | null }) {
  if (!access) return null;
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--muted)",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {String(access).toUpperCase()}
    </span>
  );
}

function parseCourseList(data: any): Course[] {
  if (Array.isArray(data)) return data as Course[];
  if (Array.isArray(data?.items)) return data.items as Course[];
  return [];
}

function RequestsBadge({ n }: { n: number }) {
  if (!n || n <= 0) return null;
  return (
    <span
      style={{
        marginLeft: 8,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,255,128,.45)",
        background: "rgba(0,255,128,.12)",
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 950,
        lineHeight: "16px",
      }}
      title={`${n} pending requests`}
    >
      {n}
    </span>
  );
}

// Narrowing helper: ensure we only render markers for courses that have coords
function hasCoords(
  c: any,
): c is { id: string; name: string; lat: number; lon: number } {
  return (
    c &&
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.lat === "number" &&
    typeof c.lon === "number"
  );
}

export default function RightRail() {
  const { selectedCourse, clearSelectedCourse, setSelectedCourse } =
    useSelectedCourse();
  const { token } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState<number>(0);

  // Load some courses for markers (fallback)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/courses`);
        if (!res.ok) return;
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  // Keep center in sync with selected course, but safe for optional coords
  useEffect(() => {
    const lat = (selectedCourse as any)?.lat;
    const lon = (selectedCourse as any)?.lon;
    if (typeof lat === "number" && typeof lon === "number") {
      setCenter({ lat, lon });
    }
  }, [selectedCourse]);

  // Hydrate selected course with details if we only have id/name/lat/lon
  useEffect(() => {
    if (!selectedCourse?.id) return;
    if (courses.length === 0) return;

    const full = courses.find((c) => c.id === selectedCourse.id);
    if (!full) return;

    const missingDetails =
      ((selectedCourse as any).city == null && full.city != null) ||
      ((selectedCourse as any).country == null && full.country != null) ||
      ((selectedCourse as any).website == null && full.website != null) ||
      ((selectedCourse as any).holes == null && full.holes != null) ||
      ((selectedCourse as any).access == null && full.access != null);

    if (!missingDetails) return;

    setSelectedCourse({
      ...(selectedCourse as any),
      ...full,
    });
  }, [selectedCourse?.id, selectedCourse, courses, setSelectedCourse]);

  // Load count of followed courses (for button label)
  useEffect(() => {
    const run = async () => {
      if (!token) {
        setFollowingCount(null);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/courses/me/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setFollowingCount(null);
          return;
        }
        const data = await res.json();
        const list = parseCourseList(data);
        setFollowingCount(list.length);
      } catch {
        setFollowingCount(null);
      }
    };

    run();
  }, [token]);

  // Following status for selected course
  useEffect(() => {
    const run = async () => {
      if (!selectedCourse?.id || !token) {
        setIsFollowing(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/courses/${selectedCourse.id}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsFollowing(!!data?.following);
      } catch {
        // ignore
      }
    };
    run();
  }, [selectedCourse?.id, token]);

  const toggleFollow = async () => {
    if (!selectedCourse?.id || !token || followBusy) return;

    const prev = isFollowing;
    const next = !prev;

    // optimistic UI
    setIsFollowing(next);
    setFollowBusy(true);
    setFollowingCount((n) => {
      if (n == null) return n;
      return next ? n + 1 : Math.max(0, n - 1);
    });

    try {
      const res = await fetch(`${API_BASE}/courses/${selectedCourse.id}/follow`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // rollback
        setIsFollowing(prev);
        setFollowingCount((n) => {
          if (n == null) return n;
          return prev ? n + 1 : Math.max(0, n - 1);
        });
      }
    } catch {
      // rollback
      setIsFollowing(prev);
      setFollowingCount((n) => {
        if (n == null) return n;
        return prev ? n + 1 : Math.max(0, n - 1);
      });
    } finally {
      setFollowBusy(false);
    }
  };

  const loadRequestCount = useCallback(async () => {
    if (!token) {
      setRequestCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/follows/requests/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const n = Number(data?.count ?? 0);
      if (Number.isFinite(n)) setRequestCount(n);
    } catch {
      // ignore
    }
  }, [token]);

  // Load + poll request count
  useEffect(() => {
    if (!token) {
      setRequestCount(0);
      return;
    }

    loadRequestCount();

    const t = window.setInterval(() => {
      loadRequestCount();
    }, 20000);

    return () => window.clearInterval(t);
  }, [token, loadRequestCount]);

  const markers = useMemo(() => {
    if (selectedCourse) {
      return hasCoords(selectedCourse) ? [selectedCourse] : [];
    }
    return courses.filter(hasCoords).slice(0, 80);

::contentReference[oaicite:0]{index=0}