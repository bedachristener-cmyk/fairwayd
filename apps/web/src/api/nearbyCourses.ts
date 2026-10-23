import { API_BASE } from "./base";

/**
 * Uses Fairwayd's existing public course endpoint.
 * The API filters for active Course rows and calculates distances server-side.
 * No new tables, migrations, Google requests or client-side copies of courses.
 */
export type NearbyCourse = {
  id: string;
  name: string;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  country: string;
  lat: number;
  lon: number;
  distanceM: number;
};

export type NearbyCoursesResult = {
  count: number;
  items: NearbyCourse[];
};

export async function getNearbyCourses(
  position: { lat: number; lon: number; radiusKm: 10 | 25 | 50 | 100 },
  signal?: AbortSignal,
): Promise<NearbyCoursesResult> {
  const url = new URL(`${API_BASE}/courses/nearby`);
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lon));
  url.searchParams.set("radiusM", String(position.radiusKm * 1000));

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Could not load nearby golf courses.");

  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("items" in body)) {
    throw new Error("Invalid nearby courses response.");
  }
  const raw = (body as { items: unknown }).items;
  if (!Array.isArray(raw)) throw new Error("Invalid nearby courses response.");

  const items: NearbyCourse[] = raw.filter((item): item is NearbyCourse => {
    if (!item || typeof item !== "object") return false;
    const course = item as Partial<NearbyCourse>;
    return typeof course.id === "string" &&
      typeof course.name === "string" &&
      typeof course.lat === "number" &&
      typeof course.lon === "number" &&
      typeof course.distanceM === "number" &&
      Number.isFinite(course.lat) && Number.isFinite(course.lon) &&
      Number.isFinite(course.distanceM) && course.distanceM >= 0 &&
      course.lat >= -90 && course.lat <= 90 &&
      course.lon >= -180 && course.lon <= 180;
  });
  return { count: items.length, items };
}
