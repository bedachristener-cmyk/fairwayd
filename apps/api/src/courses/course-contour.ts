export type CourseContourKind =
  | 'course'
  | 'fairway'
  | 'green'
  | 'tee'
  | 'bunker';

export type CourseContourFeature = {
  id: string;
  kind: CourseContourKind;
  name: string | null;
  coordinates: [number, number][];
};

type OverpassGeometryPoint = {
  lat: number;
  lon: number;
};

type OverpassElement = {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryPoint[];
};

export type OverpassPayload = {
  elements?: OverpassElement[];
};

export type CourseContourBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const MAX_SPAN_DEGREES = 0.2;

export function validateCourseContourBounds(
  bounds: CourseContourBounds,
): string[] {
  const errors: string[] = [];
  const values = [
    bounds.minLat,
    bounds.maxLat,
    bounds.minLon,
    bounds.maxLon,
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    return ['bounds must contain finite numbers'];
  }
  if (
    bounds.minLat < -90 ||
    bounds.maxLat > 90 ||
    bounds.minLon < -180 ||
    bounds.maxLon > 180
  ) {
    errors.push('bounds are outside the valid coordinate range');
  }
  if (bounds.minLat >= bounds.maxLat || bounds.minLon >= bounds.maxLon) {
    errors.push('bounds must have a positive area');
  }
  if (
    bounds.maxLat - bounds.minLat > MAX_SPAN_DEGREES ||
    bounds.maxLon - bounds.minLon > MAX_SPAN_DEGREES
  ) {
    errors.push('bounds are too large for the contour endpoint');
  }

  return errors;
}

export function buildCourseContourOverpassQuery(
  bounds: CourseContourBounds,
): string {
  const bbox = [
    bounds.minLat,
    bounds.minLon,
    bounds.maxLat,
    bounds.maxLon,
  ].join(',');

  return [
    '[out:json][timeout:25][maxsize:16777216];',
    '(',
    `way["leisure"="golf_course"](${bbox});`,
    `way["golf"~"^(fairway|green|tee|bunker)$"](${bbox});`,
    ');',
    'out tags geom qt;',
  ].join('');
}

function resolveKind(tags: Record<string, string>): CourseContourKind | null {
  if (tags.leisure === 'golf_course') return 'course';

  const golf = tags.golf;
  if (
    golf === 'fairway' ||
    golf === 'green' ||
    golf === 'tee' ||
    golf === 'bunker'
  ) {
    return golf;
  }

  return null;
}

function isSameCoordinate(
  left: [number, number],
  right: [number, number],
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

export function parseCourseContourFeatures(
  payload: OverpassPayload,
): CourseContourFeature[] {
  const features: CourseContourFeature[] = [];

  for (const element of payload.elements ?? []) {
    if (element.type !== 'way' || !Number.isInteger(element.id)) continue;

    const kind = resolveKind(element.tags ?? {});
    if (!kind) continue;

    const coordinates = (element.geometry ?? [])
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lon) &&
          point.lat >= -90 &&
          point.lat <= 90 &&
          point.lon >= -180 &&
          point.lon <= 180,
      )
      .map((point) => [point.lon, point.lat] as [number, number]);

    if (coordinates.length < 3) continue;

    if (!isSameCoordinate(coordinates[0], coordinates.at(-1)!)) {
      coordinates.push([...coordinates[0]] as [number, number]);
    }
    if (coordinates.length < 4) continue;

    features.push({
      id: `way/${element.id}`,
      kind,
      name: element.tags?.name?.trim() || null,
      coordinates,
    });
  }

  return features;
}
