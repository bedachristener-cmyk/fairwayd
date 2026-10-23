export type ReviewedEgCourseDefinition = {
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

export type ReviewedEgCourseDeactivation = {
  name: string;
  placeId: string;
  reason: string;
};

const GOOGLE_EVIDENCE =
  'Google Places targeted review cross-checked against the Egyptian Golf Federation and current official club information';
const OFFICIAL_EVIDENCE =
  'Current Egyptian Golf Federation listing cross-checked against current map data';

export const REVIEWED_EG_COURSE_UPDATES: ReviewedEgCourseDefinition[] = [];

export const REVIEWED_EG_COURSE_ADDITIONS: ReviewedEgCourseDefinition[] = [
  {
    name: 'Alexandria Sporting Club Golf Course',
    city: 'Alexandria',
    region: 'Alexandria',
    holes: 18,
    lat: 31.2155186,
    lon: 29.9331126,
    website: 'http://alexsportingclub.com/',
    placeId: 'ChIJdfXbQYnE9RQRhLHmynPh4PU',
    evidence: OFFICIAL_EVIDENCE,
  },
  {
    name: 'The Allegria Golf Club',
    city: 'Sheikh Zayed City',
    region: 'Giza',
    holes: 18,
    lat: 30.0682785,
    lon: 30.964011,
    website: 'http://www.theallegriacairo.com/',
    phone: '+20 12 23779788',
    placeId: 'ChIJR-Wk_BBZWBQR0INtH6rqnOM',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Amarante Golf City Golf Course',
    city: 'El Obour',
    region: 'Qalyubia',
    holes: 18,
    lat: 30.1782519,
    lon: 31.479904,
    placeId: 'ChIJmZZ99x0bWBQRP-R2ObiF2cw',
    evidence:
      'Operational outdoor golf-course result cross-checked against current Egypt golf directories and map imagery',
  },
  {
    name: 'Ancient Sands Golf Club',
    city: 'El Gouna',
    region: 'Red Sea',
    holes: 18,
    lat: 27.4119346,
    lon: 33.6609607,
    website: 'https://www.elgouna.com/',
    phone: '+20 12 70293332',
    placeId: 'ChIJiX5TLABnUhQRyIxyaX8I8GE',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Dreamland Golf Resort – Championship Course',
    city: '6th of October City',
    region: 'Giza',
    holes: 18,
    lat: 29.9686473,
    lon: 31.0418743,
    website: 'http://www.dreamlandgolf.com/',
    placeId: 'ChIJNXfRmGVRWBQRMBcL3IxmoZc',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Dreamland Golf Resort – Pharaoh Course',
    city: '6th of October City',
    region: 'Giza',
    holes: 9,
    lat: 29.9715669,
    lon: 31.0596636,
    website: 'http://www.dreamlandgolf.com/',
    placeId: 'ChIJo6ZvhRJRWBQRAK3oeniiy0o',
    evidence:
      'Independently named and searchable 9-hole course at Dreamland, cross-checked against current resort information',
  },
  {
    name: 'El Gouna Golf Club',
    city: 'El Gouna',
    region: 'Red Sea',
    holes: 18,
    lat: 27.3884793,
    lon: 33.6812093,
    website: 'https://www.elgouna.com/',
    phone: '+20 7818672593',
    placeId: 'ChIJLRUA0J5mUhQR_CyzPxg5JAw',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Gezira Sporting Club Golf Course',
    city: 'Cairo',
    region: 'Cairo',
    holes: 18,
    lat: 30.0536829,
    lon: 31.2238622,
    website: 'https://www.gsc.eg/',
    phone: '+20 2 27356000',
    placeId: 'ChIJ39PTm95AWBQRL5DRMA9YRoQ',
    evidence:
      'Official federation club; five Google playing-area markers consolidated into one facility marker',
  },
  {
    name: 'Hacienda Bay Golf Club',
    city: 'El Alamein',
    region: 'Matrouh',
    holes: 18,
    lat: 30.9415138,
    lon: 28.7915691,
    phone: '+20 12 12467444',
    placeId: 'ChIJ64d-N7f7XxQRqsaXK7T7QGQ',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Katameya Dunes – Lakes Course',
    city: 'New Cairo',
    region: 'Cairo',
    holes: 18,
    lat: 30.004072,
    lon: 31.5146266,
    website: 'http://www.katameyadunes.com/',
    phone: '+20 10 00084588',
    placeId: 'ChIJT0vPDPEjWBQRIX9mohPkv9Y',
    evidence:
      'Independently named and searchable championship layout at Katameya Dunes',
  },
  {
    name: 'Katameya Dunes – Palms Course',
    city: 'New Cairo',
    region: 'Cairo',
    holes: 18,
    lat: 29.9975219,
    lon: 31.5146115,
    website: 'http://www.katameyadunes.com/',
    placeId: 'ChIJN25RAq8jWBQReERUyl0ERMU',
    evidence:
      'Independently named and searchable championship layout at Katameya Dunes',
  },
  {
    name: 'Katameya Heights Golf Club',
    city: 'New Cairo',
    region: 'Cairo',
    holes: 27,
    lat: 29.9958991,
    lon: 31.4054171,
    website: 'http://katameyaheights.com/',
    phone: '+20 2 27580517',
    placeId: 'ChIJ3QPvlIM8WBQRW3XwSEA8VcE',
    evidence:
      'Official federation facility; championship and 9-hole layouts consolidated into one facility marker',
  },
  {
    name: 'Madinat Makadi Golf Resort',
    city: 'Makadi Bay',
    region: 'Red Sea',
    holes: 27,
    lat: 26.9840446,
    lon: 33.8923347,
    website: 'http://www.madinatmakadigolf.com/',
    phone: '+20 65 3590039',
    placeId: 'ChIJqX7TSuSHUhQRNDZMM-ZOqzQ',
    evidence:
      'Official federation facility; championship and short-course markers consolidated into one facility marker',
  },
  {
    name: 'Madinaty Golf Club',
    city: 'Madinaty',
    region: 'Cairo',
    holes: 18,
    lat: 30.0998207,
    lon: 31.6246427,
    website: 'http://www.madinatygolfclub.com/',
    phone: '+20 11 01134518',
    placeId: 'ChIJj1Qx5v4dWBQRdeiIMyykdZU',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Marassi Golf Course',
    city: 'El Alamein',
    region: 'Matrouh',
    holes: 18,
    lat: 30.9752568,
    lon: 28.7535582,
    website: 'https://addresshotels.com/en/hotels/address-marassi-golf-resort/',
    phone: '+20 46 4681666',
    placeId: 'ChIJLe3eqY39XxQRK2DfKeE_DiU',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Mirage City Golf Club',
    city: 'New Cairo',
    region: 'Cairo',
    holes: 27,
    lat: 30.0716957,
    lon: 31.4354433,
    phone: '+20 2 24091464',
    placeId: 'ChIJmYvuTvsXWBQRdkobRUbF0ak',
    evidence:
      'Official federation facility; championship and executive layouts consolidated into one facility marker',
  },
  {
    name: 'NEWGIZA Golf Club',
    city: 'New Giza',
    region: 'Giza',
    holes: 18,
    lat: 30.0076908,
    lon: 31.0562739,
    website: 'http://www.newgizagolf.com/',
    placeId: 'ChIJqXYH_5daWBQR_F1123I5PL4',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Palm Hills Golf Club',
    city: '6th of October City',
    region: 'Giza',
    holes: 18,
    lat: 30.0084141,
    lon: 31.0334842,
    website: 'https://www.palmhillsdevelopments.com/',
    placeId: 'ChIJzZ6EbgBbWBQRUTl8N6xVyIo',
    evidence:
      'Official federation club with reviewed clubhouse marker; residential gate and hotel aliases excluded',
  },
  {
    name: 'Pickalbatros Golf Club Sharm El Sheikh',
    city: 'Sharm El Sheikh',
    region: 'South Sinai',
    holes: 18,
    lat: 27.9415033,
    lon: 34.3659466,
    website: 'https://www.pickalbatros.com/golf-beach-resort/Pickalbatros-golf-course',
    phone: '+20 10 10106674',
    placeId: 'ChIJ_8ft4EVJUxQRCte-xvHj__g',
    evidence:
      'Current course identity at the former Maritim Jolie Ville facility; former-name and resort aliases consolidated',
  },
  {
    name: 'Pyramids Golf & Country Club',
    city: 'Solimaneyah',
    region: 'Giza',
    holes: 27,
    lat: 30.1605582,
    lon: 30.8189447,
    website: 'http://www.solaimaneyah.com/',
    placeId: 'ChIJb7uzXjP1WBQR9SEXWTfmgK8',
    evidence:
      'Operational executive-course marker cross-checked against the established Solimaneyah facility',
  },
  {
    name: 'Porto Marina Golf Club',
    city: 'El Alamein',
    region: 'Matrouh',
    holes: 18,
    lat: 30.8354218,
    lon: 28.9298381,
    phone: '+20 10 26107694',
    placeId: 'ChIJnynyAUHuXxQRPXaHpbi2VpY',
    evidence:
      'Official federation club and current resort listing cross-checked against current map data',
  },
  {
    name: 'Sokhna Golf Club',
    city: 'Ain Sokhna',
    region: 'Suez',
    holes: 27,
    lat: 29.7296834,
    lon: 32.3823577,
    website: 'http://sokhnagolfclub.com/',
    phone: '+20 10 90120051',
    placeId: 'ChIJp2w-c55MVhQRmXFhrjkY4OM',
    evidence:
      'Official federation facility; Einbay A/B marker consolidated into the 27-hole facility marker',
  },
  {
    name: 'Somabay Golf',
    city: 'Soma Bay',
    region: 'Red Sea',
    holes: 27,
    lat: 26.8578479,
    lon: 33.9924834,
    website: 'https://somabay.com/golf/',
    phone: '+20 12 23503528',
    placeId: 'ChIJV8bWj7xzTRQRuSBEl2uNClQ',
    evidence:
      'Official federation facility; championship, par-3 and scoring-area markers consolidated into one facility marker',
  },
  {
    name: 'Steigenberger Al Dau Golf Course',
    city: 'Hurghada',
    region: 'Red Sea',
    holes: 9,
    lat: 27.1642749,
    lon: 33.8245487,
    website: 'https://steigenbergeraldauresort.com/en/steigenberger-aldau-beach',
    phone: '+20 65 3465400',
    placeId: 'ChIJRbDGSuSHUhQRTTXIeygGFfk',
    evidence:
      'Official federation 9-hole course cross-checked against the current resort location',
  },
  {
    name: 'Stella Di Mare Golf Club',
    city: 'Ain Sokhna',
    region: 'Suez',
    holes: 18,
    lat: 29.6698884,
    lon: 32.3496986,
    website: 'https://stelladimare.com/golf-hotel/',
    phone: '+20 62 3250300',
    placeId: 'ChIJjdgMjbayVxQR1nFMVPpLD3M',
    evidence: GOOGLE_EVIDENCE,
  },
  {
    name: 'Uptown Cairo Golf Club',
    city: 'Cairo',
    region: 'Cairo',
    holes: 18,
    lat: 30.0218728,
    lon: 31.3001834,
    phone: '+20 2 25032021',
    placeId: 'ChIJnUnZWgA_WBQRxzJ82KaxTkk',
    evidence: GOOGLE_EVIDENCE,
  },
];

export const REVIEWED_EG_COURSE_DEACTIVATIONS: ReviewedEgCourseDeactivation[] = [
  {
    name: 'Orange Lakes Golf Club',
    placeId: 'ChIJwySO6Dn0WBQRJaHyMCZ-Uxc',
    reason:
      'Permanently closed and liquidated; the Google marker is on the Cairo–Alexandria highway and the nearby active facility is already represented as Pyramids Golf & Country Club',
  },
];

export function validateReviewedEgCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const identities = new Set<string>();
  const ids = new Set<string>();

  for (const definition of [
    ...REVIEWED_EG_COURSE_UPDATES,
    ...REVIEWED_EG_COURSE_ADDITIONS,
  ]) {
    if (!definition.name.trim()) errors.push('course name is empty');
    if (!definition.city.trim()) errors.push(`city is empty: ${definition.name}`);
    if (!definition.region.trim()) errors.push(`region is empty: ${definition.name}`);
    if (!Number.isFinite(definition.lat) || definition.lat < 21.5 || definition.lat > 31.8) {
      errors.push(`invalid latitude: ${definition.name}`);
    }
    if (!Number.isFinite(definition.lon) || definition.lon < 24.5 || definition.lon > 35.9) {
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
