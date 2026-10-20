export type CourseDiscoveryBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type CourseDiscoveryCountryConfig = {
  country: string;
  areas: CourseDiscoveryBounds[];
  latStep: number;
  lonStep: number;
  searchRadiusMeters: number;
};

const COUNTRY_CONFIGS: Record<string, CourseDiscoveryCountryConfig> = {
  AE: {
    country: 'AE',
    areas: [
      // Abu Dhabi and the western coastal corridor.
      { minLat: 23.8, maxLat: 25.1, minLon: 52.5, maxLon: 55.0 },
      // Dubai and the northern emirates, including Sharjah, Ajman,
      // Umm Al Quwain, Ras Al Khaimah and Fujairah.
      { minLat: 24.5, maxLat: 26.2, minLon: 54.7, maxLon: 56.6 },
      // Al Ain and the eastern inland corridor.
      { minLat: 23.8, maxLat: 24.6, minLon: 55.2, maxLon: 56.1 },
    ],
    latStep: 0.25,
    lonStep: 0.3,
    searchRadiusMeters: 22_000,
  },
  CH: {
    country: 'CH',
    areas: [
      { minLat: 45.82, maxLat: 47.82, minLon: 5.96, maxLon: 10.5 },
    ],
    latStep: 0.25,
    lonStep: 0.36,
    searchRadiusMeters: 22_000,
  },
  AT: {
    country: 'AT',
    areas: [
      { minLat: 46.35, maxLat: 49.05, minLon: 9.45, maxLon: 17.2 },
    ],
    latStep: 0.28,
    lonStep: 0.36,
    searchRadiusMeters: 22_000,
  },
  TR: {
    country: 'TR',
    areas: [
      // Nationwide coverage, including Belek/Antalya, Istanbul, Izmir,
      // Bodrum, Ankara and the Black Sea golf regions.
      { minLat: 35.75, maxLat: 42.15, minLon: 25.65, maxLon: 44.85 },
    ],
    latStep: 0.52,
    lonStep: 0.65,
    searchRadiusMeters: 45_000,
  },
  TH: {
    country: 'TH',
    areas: [
      // Northern Thailand, including Chiang Mai, Chiang Rai and Mae Hong Son.
      { minLat: 16.0, maxLat: 20.6, minLon: 97.2, maxLon: 101.3 },
      // Central and eastern Thailand, including Bangkok, Hua Hin, Pattaya and Trat.
      { minLat: 12.5, maxLat: 16.4, minLon: 98.0, maxLon: 102.8 },
      // Northeastern Thailand.
      { minLat: 14.0, maxLat: 18.7, minLon: 102.4, maxLon: 105.7 },
      // Southern peninsula and islands, including Phuket and Ko Samui.
      { minLat: 5.5, maxLat: 13.0, minLon: 98.0, maxLon: 102.2 },
    ],
    latStep: 0.45,
    lonStep: 0.5,
    searchRadiusMeters: 40_000,
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
