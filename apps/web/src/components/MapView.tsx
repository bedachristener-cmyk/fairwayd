import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function MapView() {
  const [center, setCenter] = useState<[number, number]>([47.5596, 7.5886]);
  const [radiusM, setRadiusM] = useState(50000);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadStatus, setLoadStatus] = useState("Lade Kurse...");

  // Standort holen
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  // Kurse laden
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${apiBase}/courses/nearby?lat=${center[0]}&lon=${center[1]}&radiusM=${radiusM}`
        );
        const data = await res.json();
        setCourses(data.items ?? []);
        setLoadStatus(`${data.count ?? 0} Plätze geladen`);
      } catch {
        setLoadStatus("Fehler beim Laden der Kurse");
      }
    }
    load();
  }, [center, radiusM]);

  return (
    <div style={{ height: "100vh" }}>
      <div style={{ padding: 8 }}>{loadStatus}</div>

      <MapContainer center={center} zoom={11} style={{ height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle center={center} radius={radiusM} />

        <Marker position={center}>
          <Popup>Du bist hier</Popup>
        </Marker>

        {courses.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lon]}>
            <Popup>{c.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
