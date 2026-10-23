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
  CY: {
    country: 'CY',
    areas: [
      // Complete island coverage, including the Republic of Cyprus,
      // the Sovereign Base Areas and the established courses in Northern Cyprus.
      { minLat: 34.55, maxLat: 35.75, minLon: 32.2, maxLon: 34.7 },
    ],
    latStep: 0.3,
    lonStep: 0.35,
    searchRadiusMeters: 28_000,
  },
  EG: {
    country: 'EG',
    areas: [
      // Greater Cairo, Giza, New Cairo and the New Administrative Capital.
      { minLat: 29.4, maxLat: 30.5, minLon: 30.5, maxLon: 32.2 },
      // Alexandria and the Mediterranean North Coast, including Marassi and Hacienda Bay.
      { minLat: 30.7, maxLat: 31.7, minLon: 27.0, maxLon: 30.8 },
      // Hurghada, El Gouna, Makadi Bay and Soma Bay.
      { minLat: 26.3, maxLat: 27.7, minLon: 33.3, maxLon: 34.1 },
      // Sharm El Sheikh and Taba on the Sinai Peninsula.
      { minLat: 27.7, maxLat: 30.0, minLon: 33.8, maxLon: 35.0 },
      // Suez and Ain Sokhna.
      { minLat: 29.3, maxLat: 30.2, minLon: 32.2, maxLon: 33.0 },
    ],
    latStep: 0.35,
    lonStep: 0.4,
    searchRadiusMeters: 30_000,
  },
  KH: {
    country: 'KH',
    areas: [
      // Phnom Penh and the surrounding golf corridor, including Kampong
      // Speu, Chhun On, Garden City and Vattanac.
      { minLat: 11.2, maxLat: 12.25, minLon: 104.3, maxLon: 105.5 },
      // Siem Reap and the Angkor golf region.
      { minLat: 13.0, maxLat: 13.7, minLon: 103.5, maxLon: 104.3 },
      // Koh Kong and the Dara Sakor coastal golf region.
      { minLat: 10.8, maxLat: 11.5, minLon: 102.7, maxLon: 103.5 },
    ],
    latStep: 0.35,
    lonStep: 0.4,
    searchRadiusMeters: 30_000,
  },
  PH: {
    country: 'PH',
    areas: [
      // Luzon, including Metro Manila, Clark, Baguio, Tagaytay, Batangas and Bicol.
      { minLat: 12.3, maxLat: 19.0, minLon: 119.5, maxLon: 123.0 },
      // Palawan and the western island corridor.
      { minLat: 8.5, maxLat: 12.5, minLon: 117.0, maxLon: 120.3 },
      // Visayas, including Panay, Negros, Cebu, Bohol and Leyte.
      { minLat: 9.0, maxLat: 12.8, minLon: 121.5, maxLon: 126.0 },
      // Mindanao, including Zamboanga, Cagayan de Oro, Davao and Surigao.
      { minLat: 5.0, maxLat: 10.2, minLon: 121.8, maxLon: 126.7 },
    ],
    latStep: 0.55,
    lonStep: 0.65,
    searchRadiusMeters: 45_000,
  },
  SG: {
    country: 'SG',
    areas: [
      // Complete Singapore coverage, including Sentosa, Changi, Kranji,
      // Seletar, Mandai and the central golf facilities.
      { minLat: 1.18, maxLat: 1.46, minLon: 103.6, maxLon: 104.08 },
    ],
    latStep: 0.14,
    lonStep: 0.16,
    searchRadiusMeters: 12_000,
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
  VN: {
    country: 'VN',
    areas: [
      // Northern Vietnam, including Hanoi, Ha Long, Hai Phong and the mountain regions.
      { minLat: 20.0, maxLat: 23.5, minLon: 102.5, maxLon: 108.0 },
      // Central Vietnam, including Hue, Da Nang, Hoi An, Quy Nhon and the central highlands.
      { minLat: 14.0, maxLat: 20.5, minLon: 104.5, maxLon: 109.8 },
      // Southern Vietnam, including Ho Chi Minh City, Da Lat, the Mekong region and Phu Quoc.
      { minLat: 8.2, maxLat: 14.5, minLon: 103.5, maxLon: 109.5 },
    ],
    latStep: 0.55,
    lonStep: 0.65,
    searchRadiusMeters: 45_000,
  },
  ZA: {
    country: 'ZA',
    areas: [
      // Nationwide coverage, including the Western and Eastern Cape,
      // KwaZulu-Natal, Gauteng, the inland provinces and the northern regions.
      { minLat: -35.0, maxLat: -22.0, minLon: 16.5, maxLon: 33.0 },
    ],
    latStep: 0.6,
    lonStep: 0.7,
    searchRadiusMeters: 50_000,
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
