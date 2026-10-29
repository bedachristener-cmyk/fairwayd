import { MapContainer, TileLayer } from "react-leaflet";
import { getMapBasemap } from "../maps/basemap";

export default function SimpleMap() {
  const basemap = getMapBasemap();

  return (
    <div style={{ height: "100vh" }}>
      <MapContainer center={[47.5596, 7.5886]} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution={basemap.attribution}
          url={basemap.url}
        />
      </MapContainer>
    </div>
  );
}
