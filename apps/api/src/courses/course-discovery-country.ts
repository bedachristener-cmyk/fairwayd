export type CourseDiscoveryCountryConfig = {
  country: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  latStep: number;
  lonStep: number;
  searchRadiusMeters: number;
};

const COUNTRY_CONFIGS: Record<string, CourseDiscoveryCountryConfig> = {
  CH: {
    country: 'CH',
    bounds: { minLat: 45.82, maxLat: 47.82, minLon: 5.96, maxLon: 10.5 },
    latStep: 0.25,
    lonStep: 0.36,
    searchRadiusMeters: 22_000,
  },
  AT: {
    country: 'AT',
    bounds: { minLat: 46.35, maxLat: 49.05, minLon: 9.45, maxLon: 17.2 },
    latStep: 0.28,
    lonStep: 0.36,
    searchRadiusMeters: 22_000,
  },
};

export function supportedCourseDiscoveryCountries(): string[] {
  return Object.keys(COUNTRY_CONFIGS).sort();
}

export function courseDiscoveryCountryConfig(
  country: string,
): CourseDiscoveryCountryConfig | null {
  return COUNTRY_CONFIGS[country.trim().toUpperCase()] ?? null;
}
