export type ReviewedCyCourseDefinition = {
  courseId?: string;
  name: string;
  city: string;
  region: string;
  holes?: number | null;
  lat: number;
  lon: number;
  website?: string;
  phone?: string;
  placeId: string;
  evidence: string;
  allowSharedLocation?: boolean;
};

export type ReviewedCyCourseDeactivation = {
  name: string;
  placeId: string;
  reason: string;
};

const GOOGLE_EVIDENCE =
  'Google Places targeted review cross-checked against official and current Cyprus golf inventories';
const OFFICIAL_EVIDENCE =
  'Current Cyprus Golf Federation or official club listing cross-checked against current map data';

export const REVIEWED_CY_COURSE_UPDATES: ReviewedCyCourseDefinition[] = [];

export const REVIEWED_CY_COURSE_ADDITIONS: ReviewedCyCourseDefinition[] = [
  {
    name: 'Aphrodite Hills Golf Course',
    city: 'Kouklia',
    region: 'Paphos',
    holes: 18,
    lat: 34.6830286,
    lon: 32.6085428,
    website: 'https://www.aphroditehills.com/golf/',
    phone: '+357 26 828200',
    placeId: 'ChIJtUHsVGkd5xQRUVb8U7ftmhI',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Minthis Golf Club',
    city: 'Tsada',
    region: 'Paphos',
    holes: 18,
    lat: 34.8235378,
    lon: 32.4964635,
    website: 'https://www.minthisresort.com/resort/golf-club/',
    phone: '+357 26 842200',
    placeId: 'ChIJhZ3kYaYP5xQRy5m1ycyPcLQ',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Eléa Golf Club',
    city: 'Geroskipou',
    region: 'Paphos',
    holes: 18,
    lat: 34.7554181,
    lon: 32.4838401,
    website: 'http://www.eleaestate.com/',
    phone: '+357 26 202004',
    placeId: 'ChIJuVFM4HoF5xQRie8taLwhI5o',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Columbia Secret Valley Golf Club',
    city: 'Kouklia',
    region: 'Paphos',
    holes: 18,
    lat: 34.696849,
    lon: 32.6124302,
    website: 'https://secretvalleygolfresort.com/',
    phone: '+357 26 274000',
    placeId: 'ChIJp9jQIu8b5xQRIjBu8rBiS2Y',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Limassol Greens Golf',
    city: 'Tserkezoi',
    region: 'Limassol',
    holes: 18,
    lat: 34.6444691,
    lon: 32.9777927,
    website: 'https://www.limassolgreens.com/',
    phone: '+357 25 888788',
    placeId: 'ChIJ7_Fvdkgv5xQRNhle1y5bTv4',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Vikla Golf & Country Club',
    city: 'Klonari',
    region: 'Limassol',
    holes: 12,
    lat: 34.8253125,
    lon: 33.1923906,
    website: 'http://www.vikla4golf.com/',
    phone: '+357 99 312798',
    placeId: 'ChIJxXPEKjSx4BQR7siUdLX4L-c',
    evidence:
      'Operational Google Places result, current official website and Cyprus Golf Federation membership; current playing layout reviewed as 12 holes',
  },
  {
    name: 'Marios Golf Park',
    city: 'Chloraka',
    region: 'Paphos',
    holes: 9,
    lat: 34.8096764,
    lon: 32.3965358,
    website: 'http://www.mariosgolf.com/',
    phone: '+357 99 265152',
    placeId: 'ChIJX9U4zcsH5xQRL3VROQ1ciVw',
    evidence:
      'Operational Google Places result and official 9-hole outdoor par-3 course listing',
  },
  {
    name: 'Ayios Nikolaos Golf Club',
    city: 'Vrysoulles',
    region: 'Famagusta',
    holes: 9,
    lat: 35.08557,
    lon: 33.89547,
    website: 'https://aynikgolf.club/',
    phone: '+357 23 957505',
    placeId: 'manual:cy-ayios-nikolaos',
    evidence:
      `${OFFICIAL_EVIDENCE}; 9-hole military-station course with clubhouse marker`,
  },
  {
    name: 'Joint Services Golf Club Dhekelia',
    city: 'Dhekelia',
    region: 'Larnaca',
    holes: 18,
    lat: 34.98527,
    lon: 33.72718,
    website: 'https://www.jsgcdhekelia.com/',
    phone: '+357 99 533634',
    placeId: 'manual:cy-jsgc-dhekelia',
    evidence:
      `${OFFICIAL_EVIDENCE}; restricted-access 18-hole course with clubhouse marker`,
  },
  {
    name: 'Joint Services Golf Club Episkopi',
    city: 'Episkopi',
    region: 'Limassol',
    holes: 18,
    lat: 34.66788,
    lon: 32.82938,
    website: 'https://www.jsgce.org/',
    phone: '+357 97 744313',
    placeId: 'manual:cy-jsgc-episkopi',
    evidence:
      `${OFFICIAL_EVIDENCE}; 18-hole course with OSM clubhouse marker`,
  },
  {
    name: 'Korineum Golf & Beach Resort',
    city: 'Esentepe',
    region: 'Kyrenia',
    holes: 18,
    lat: 35.3256393,
    lon: 33.5165036,
    website: 'http://www.korineumgolf.com/',
    phone: '+90 392 600 15 15',
    placeId: 'ChIJE62qqs9F3hQRiOTV_gt7h2w',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'CMC Golf Club',
    city: 'Yeşilyurt',
    region: 'Lefke',
    holes: 9,
    lat: 35.1591278,
    lon: 32.8710211,
    placeId: 'ChIJDVsr2N733RQR-1OMsXJZTgs',
    evidence:
      'Operational Google Places result cross-checked against current Northern Cyprus inventory; 9-hole layout played twice',
  },
];

export const REVIEWED_CY_COURSE_DEACTIVATIONS: ReviewedCyCourseDeactivation[] = [];

export function validateReviewedCyCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const identities = new Set<string>();
  const ids = new Set<string>();

  for (const definition of [
    ...REVIEWED_CY_COURSE_UPDATES,
    ...REVIEWED_CY_COURSE_ADDITIONS,
  ]) {
    if (!definition.name.trim()) errors.push('course name is empty');
    if (!definition.city.trim()) errors.push(`city is empty: ${definition.name}`);
    if (!definition.region.trim()) errors.push(`region is empty: ${definition.name}`);
    if (!Number.isFinite(definition.lat) || definition.lat < 34.5 || definition.lat > 35.8) {
      errors.push(`invalid latitude: ${definition.name}`);
    }
    if (!Number.isFinite(definition.lon) || definition.lon < 32.2 || definition.lon > 34.7) {
      errors.push(`invalid longitude: ${definition.name}`);
    }
    if (
      definition.holes !== undefined &&
      definition.holes !== null &&
      (!Number.isInteger(definition.holes) || definition.holes <= 0)
    ) {
      errors.push(`invalid holes: ${definition.name}`);
    }
    if (!definition.placeId.trim()) errors.push(`place id is empty: ${definition.name}`);
    if (!definition.evidence.trim()) errors.push(`evidence is empty: ${definition.name}`);
    if (names.has(definition.name)) errors.push(`duplicate name: ${definition.name}`);
    if (identities.has(definition.placeId)) {
      errors.push(`duplicate external identity: ${definition.placeId}`);
    }
    names.add(definition.name);
    identities.add(definition.placeId);
    if (definition.courseId) {
      if (ids.has(definition.courseId)) errors.push(`duplicate course id: ${definition.courseId}`);
      ids.add(definition.courseId);
    }
  }

  return errors;
}
