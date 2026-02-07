import { useEffect, useMemo, useState } from "react";
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

export default function RightRail() {
  const { selectedCourse, clearSelectedCourse, setSelectedCourse } =
    useSelectedCourse();

  const auth = useAuth() as any;
  const token =
    auth?.token ||
    localStorage.getItem("fairwayd_token") ||
    localStorage.getItem("token") ||
    "";

  const [courses, setCourses] = useState<Course[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_BASE}/courses`);
      if (!res.ok) return;
      setCourses(await res.json());
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedCourse?.lat && selectedCourse?.lon) {
      setCenter({ lat: selectedCourse.lat, lon: selectedCourse.lon });
    }
  }, [selectedCourse]);

  useEffect(() => {
    const run = async () => {
      if (!selectedCourse?.id || !token) {
        setIsFollowing(false);
        return;
      }
      const res = await fetch(
        `${API_BASE}/courses/${selectedCourse.id}/following`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = await res.json();
      setIsFollowing(!!data?.following);
    };
    run();
  }, [selectedCourse?.id, token]);

  const toggleFollow = async () => {
    if (!selectedCourse?.id) return;

    const next = !isFollowing;
    setIsFollowing(next);

    await fetch(`${API_BASE}/courses/${selectedCourse.id}/follow`, {
      method: next ? "POST" : "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const markers = useMemo(() => {
    if (selectedCourse) {
      return [selectedCourse];
    }
    return courses.slice(0, 80);
  }, [selectedCourse, courses]);

  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        alignSelf: "start",
        background: "var(--card)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 22px rgba(0,0,0,0.35)",
        padding: 16,
        color: "var(--text)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Map</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link to="/map" style={{ ...pill, textDecoration: "none" }}>
            Open
          </Link>

          {selectedCourse && (
            <button
              onClick={() => {
                clearSelectedCourse();
                setCenter(DEFAULT_CENTER);
              }}
              style={{ ...pill }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {selectedCourse ? (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13 }}>
            <b>Selected:</b> {selectedCourse.name}
          </div>

          <button
            onClick={toggleFollow}
            disabled={followBusy}
            style={{
              marginLeft: "auto",
              ...pill,
              background: isFollowing ? "rgba(0,255,128,.18)" : "var(--muted)",
              fontWeight: 900,
            }}
          >
            {isFollowing ? "✓ Following" : "+ Follow"}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--sub)" }}>
          Select a course by clicking a marker.
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          height: 220,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap lat={center.lat} lon={center.lon} />

          {markers.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={golfIcon}
              eventHandlers={{
                click: () => {
                  setSelectedCourse(c);
                },
              }}
            >
              <Popup>
                <div style={{ fontWeight: 900 }}>{c.name}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

const pill: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontSize: 12,
};
