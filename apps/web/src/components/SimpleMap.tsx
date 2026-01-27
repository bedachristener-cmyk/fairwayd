import { MapContainer, TileLayer } from "react-leaflet";

export default function SimpleMap() {
  return (
    <div style={{ height: "100vh" }}>
      <MapContainer center={[47.5596, 7.5886]} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
      </MapContainer>
    </div>
  );
}
