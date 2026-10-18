export type CourseCoordinateRecord = {
  id: string;
  country: string;
  lat: number;
  lon: number;
  verified: boolean;
  source: string;
};

export type CourseCoordinateFlags = {
  validRange: boolean;
  zeroIsland: boolean;
  sharedCoordinate: boolean;
};

export type CountryCoordinateSummary = {
  country: string;
  active: number;
  verified: number;
  unverified: number;
  invalidRange: number;
  zeroIsland: number;
  sharedCoordinateCourses: number;
  sources: Record<string, number>;
};

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function coordinateBucket(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

export function auditCourseCoordinates(records: CourseCoordinateRecord[]): {
  flagsById: Map<string, CourseCoordinateFlags>;
  summaries: CountryCoordinateSummary[];
} {
  const coordinateCounts = new Map<string, number>();

  for (const record of records) {
    if (!isValidCoordinate(record.lat, record.lon)) continue;
    const key = coordinateBucket(record.lat, record.lon);
    coordinateCounts.set(key, (coordinateCounts.get(key) ?? 0) + 1);
  }

  const flagsById = new Map<string, CourseCoordinateFlags>();
  const summariesByCountry = new Map<string, CountryCoordinateSummary>();

  for (const record of records) {
    const country = record.country.trim().toUpperCase() || '<MISSING>';
    const validRange = isValidCoordinate(record.lat, record.lon);
    const zeroIsland = validRange && record.lat === 0 && record.lon === 0;
    const sharedCoordinate =
      validRange &&
      (coordinateCounts.get(coordinateBucket(record.lat, record.lon)) ?? 0) > 1;

    flagsById.set(record.id, { validRange, zeroIsland, sharedCoordinate });

    const summary =
      summariesByCountry.get(country) ??
      {
        country,
        active: 0,
        verified: 0,
        unverified: 0,
        invalidRange: 0,
        zeroIsland: 0,
        sharedCoordinateCourses: 0,
        sources: {},
      };

    summary.active++;
    record.verified ? summary.verified++ : summary.unverified++;
    if (!validRange) summary.invalidRange++;
    if (zeroIsland) summary.zeroIsland++;
    if (sharedCoordinate) summary.sharedCoordinateCourses++;

    const source = record.source.trim() || '<MISSING>';
    summary.sources[source] = (summary.sources[source] ?? 0) + 1;
    summariesByCountry.set(country, summary);
  }

  return {
    flagsById,
    summaries: [...summariesByCountry.values()].sort((a, b) =>
      a.country.localeCompare(b.country),
    ),
  };
}
