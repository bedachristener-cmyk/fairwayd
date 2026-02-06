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

    // initial + on interactions
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

  const [center, setCenter] = useState<[number, number]>([47.5596, 7.5886]); // Basel fallback
  const [radiusM, setRadiusM] = useState(50000); // keep for "near me" circle (optional)
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loadStatus, setLoadStatus] = useState("Loading courses...");

  // Standort holen (optional)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
    );
  }, []);

  // (Optional) derive a nicer status
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

  return (
    <div style={{ height: "100vh" }}>
      <div style={{ padding: 8, color: "var(--text)" }}>{status}</div>

      <MapContainer center={center} zoom={11} style={{ height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Optional: "near me" circle */}
        <Circle center={center} radius={radiusM} />

        {/* You are here */}
        <Marker position={center} icon={meIcon}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Load only courses in current visible map bounds */}
        <CoursesByBoundsLoader onStatus={setLoadStatus} onItems={setCourses} />

        {/* Render markers */}
        {courses.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lon]} icon={courseIcon}>
            <Popup>{c.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
