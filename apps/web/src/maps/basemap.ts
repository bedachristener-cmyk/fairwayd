export type BasemapProvider = "carto" | "openstreetmap";

export type BasemapConfig = {
  provider: BasemapProvider;
  url: string;
  attribution: string;
};

const openStreetMapBasemap: BasemapConfig = {
  provider: "openstreetmap",
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
};

export function resolveMapBasemap(
  cartoBasemapKey: string | null | undefined,
): BasemapConfig {
  const key = cartoBasemapKey?.trim();
  if (!key) return openStreetMapBasemap;

  return {
    provider: "carto",
    url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(key)}`,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  };
}

export function getMapBasemap() {
  return resolveMapBasemap(import.meta.env.VITE_CARTO_BASEMAP_KEY);
}
