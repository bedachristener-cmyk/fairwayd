import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { API_BASE } from "../api/base";
import { useSelectedCourse } from "../state/SelectedCourseContext";

type Course = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

const DEFAULT_CENTER = { lat: 47.5596, lon: 7.5886 }; // Basel fallback

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
  "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
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

  const [courses, setCourses] = useState<Course[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  // Load courses once (for markers when no course selected)
  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  // Update center when selected course changes
  useEffect(() => {
    if (selectedCourse?.lat && selectedCourse?.lon) {
      setCenter({ lat: selectedCourse.lat, lon: selectedCourse.lon });
    }
  }, [selectedCourse?.id, selectedCourse?.lat, selectedCourse?.lon]);

  // Marker list:
  // - if selectedCourse exists -> only that marker
  // - else -> show courses markers (cap to keep UI light)
  const markers = useMemo(() => {
    if (selectedCourse?.id && selectedCourse.lat && selectedCourse.lon) {
      return [
        {
          id: selectedCourse.id,
          name: selectedCourse.name ?? selectedCourse.id,
          lat: selectedCourse.lat,
          lon: selectedCourse.lon,
        },
      ];
    }
    // keep map light: show at most 80 markers
    return courses.slice(0, 80);
  }, [selectedCourse, courses]);

  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        alignSelf: "start",
        background: "white",
        borderRadius: 16,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Map</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link
            to="/map"
            style={{
              ...pill,
              marginTop: 0,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Open
          </Link>
          {selectedCourse ? (
            <button
              type="button"
              onClick={() => {
                clearSelectedCourse();
                setCenter(DEFAULT_CENTER);
              }}
              style={{
                ...pill,
                marginTop: 0,
                cursor: "pointer",
                background: "rgba(0,0,0,.03)",
              }}
              title="Clear selected course"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {selectedCourse ? (
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
          <b>Selected:</b> {selectedCourse.name ?? selectedCourse.id}
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Select a course by clicking a marker (or open the full map).
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          height: 220,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
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

          <RecenterMap lat={center.lat} lon={center.lon} zoom={12} />

          {markers.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={golfIcon}
              eventHandlers={{
                click: () => {
                  setSelectedCourse({
                    id: c.id,
                    name: c.name,
                    lat: c.lat,
                    lon: c.lon,
                  });
                },
              }}
            >
              <Popup>
                <div style={{ fontFamily: "system-ui" }}>
                  <div style={{ fontWeight: 900 }}>{c.name}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    Click to select
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Context</div>
        <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
          Spater: Trending courses, friends activity, suggestions.
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={pill}>⛳ Course filters (soon)</div>
          <div style={pill}>👥 Friends (soon)</div>
          <div style={pill}>🔥 Trending (soon)</div>
        </div>
      </div>
    </div>
  );
}

const pill: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.08)",
  fontWeight: 700,
  fontSize: 12,
  background: "transparent",
};
