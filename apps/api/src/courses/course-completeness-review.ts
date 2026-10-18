export type CourseDiscoveryPoint = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export type CourseDiscoveryMatch = {
  course: CourseDiscoveryPoint;
  distanceKm: number;
};

export type CourseDiscoveryStatus =
  | 'MATCHED'
  | 'REVIEW_NEARBY'
  | 'POSSIBLE_MISSING';

export function courseDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

export function nearestCourse(
  point: { lat: number; lon: number },
  courses: CourseDiscoveryPoint[],
): CourseDiscoveryMatch | null {
  let nearest: CourseDiscoveryMatch | null = null;

  for (const course of courses) {
    const distanceKm = courseDistanceKm(point, course);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { course, distanceKm };
    }
  }

  return nearest;
}

export function classifyDiscoveredCourse(
  distanceKm: number,
): CourseDiscoveryStatus {
  if (distanceKm <= 0.75) return 'MATCHED';
  if (distanceKm <= 3) return 'REVIEW_NEARBY';
  return 'POSSIBLE_MISSING';
}

export function buildDiscoveryGrid(
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
  latStep: number,
  lonStep: number,
): Array<{ lat: number; lon: number }> {
  if (latStep <= 0 || lonStep <= 0) {
    throw new Error('Discovery grid steps must be positive');
  }

  const centers: Array<{ lat: number; lon: number }> = [];
  for (let lat = bounds.minLat; lat <= bounds.maxLat + 1e-9; lat += latStep) {
    for (
      let lon = bounds.minLon;
      lon <= bounds.maxLon + 1e-9;
      lon += lonStep
    ) {
      centers.push({
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
      });
    }
  }

  return centers;
}
