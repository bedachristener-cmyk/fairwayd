/** Exact great-circle distance; bounding boxes are only a DB pre-filter. */
export function golfServiceDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = Math.PI / 180;
  const dLat = (latitudeB - latitudeA) * toRadians;
  const dLon = (longitudeB - longitudeA) * toRadians;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(latitudeA * toRadians) * Math.cos(latitudeB * toRadians)
    * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Returns a conservative rectangle, supporting international-date-line crossing. */
export function golfServiceBoundingBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const minLat = Math.max(-90, lat - latDelta);
  const maxLat = Math.min(90, lat + latDelta);
  const cosLat = Math.min(
    Math.cos(minLat * Math.PI / 180),
    Math.cos(maxLat * Math.PI / 180),
  );
  const lonDelta = cosLat <= 0.001
    ? 180
    : Math.min(180, radiusKm / (111.32 * cosLat));
  return {
    minLat,
    maxLat,
    west: lon - lonDelta,
    east: lon + lonDelta,
    allLongitudes: lonDelta >= 180,
  };
}
