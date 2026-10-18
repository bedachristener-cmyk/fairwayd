export type ReviewedMissingChCourse = {
  name: string;
  city: string;
  region: string;
  postalCode: string;
  holes: 9 | 18;
  website: string;
  lat: number;
  lon: number;
  googlePlaceId: string;
};

export const REVIEWED_MISSING_CH_COURSES: ReviewedMissingChCourse[] = [
  {
    name: 'Golf Ascona',
    city: 'Ascona',
    region: 'TI',
    postalCode: '6612',
    holes: 18,
    website: 'https://www.golfascona.ch/',
    lat: 46.1490234,
    lon: 8.7826716,
    googlePlaceId: 'ChIJ-3wgNnEZhEcR7HxmoM1CpXo',
  },
  {
    name: 'Golfclub Aaretal',
    city: 'Kiesen',
    region: 'BE',
    postalCode: '3629',
    holes: 9,
    website: 'https://www.golfaaretal.ch/',
    lat: 46.812303,
    lon: 7.5837075999999985,
    googlePlaceId: 'ChIJ_2JYHuE5jkcR5I8rDrSHdpo',
  },
  {
    name: 'Andermatt Golf Course',
    city: 'Andermatt',
    region: 'UR',
    postalCode: '6490',
    holes: 18,
    website: 'https://www.andermatt-swissalps.ch/',
    lat: 46.634141500000005,
    lon: 8.5838584,
    googlePlaceId: 'ChIJpZs2MsyahUcRihPAeHoJ2ao',
  },
  {
    name: 'Golf Brigels',
    city: 'Breil-Brigels',
    region: 'GR',
    postalCode: '7165',
    holes: 9,
    website: 'https://www.golfidyll.ch/',
    lat: 46.767692499999995,
    lon: 9.0716714,
    googlePlaceId: 'ChIJMzQRm-d4hUcR0mZFWGHZzKY',
  },
  {
    name: 'Golf Club Domaine du Brésil',
    city: 'Goumoens-le-Jux',
    region: 'VD',
    postalCode: '1376',
    holes: 9,
    website: 'https://www.golfbresil.ch/',
    lat: 46.673961999999996,
    lon: 6.591392000000001,
    googlePlaceId: 'ChIJW5j2DlZGjEcRUc5KZ_6xxX0',
  },
  {
    name: 'Dolder Golfclub Zürich',
    city: 'Zürich',
    region: 'ZH',
    postalCode: '8032',
    holes: 9,
    website: 'https://www.doldergolf.ch/',
    lat: 47.3723068,
    lon: 8.5739555,
    googlePlaceId: 'ChIJpxILe5wLkEcRwcIOhvDoJzw',
  },
  {
    name: 'Golfclub Entfelden',
    city: 'Oberentfelden',
    region: 'AG',
    postalCode: '5036',
    holes: 18,
    website: 'https://www.aarau-west.ch/golf/',
    lat: 47.3478704,
    lon: 8.0482134,
    googlePlaceId: 'ChIJO0yjhw4AkEcR1Bn_pVCrCJs',
  },
  {
    name: 'Golf Club Heidiland',
    city: 'Bad Ragaz',
    region: 'SG',
    postalCode: '7310',
    holes: 9,
    website: 'https://www.gcheidiland.ch/',
    lat: 46.9991938,
    lon: 9.516690299999999,
    googlePlaceId: 'ChIJIe06QKv5hUcRS7AA0ah3tA8',
  },
  {
    name: 'Golfclub Lenzerheide',
    city: 'Lantsch/Lenz',
    region: 'GR',
    postalCode: '7083',
    holes: 18,
    website: 'https://golflenzerheide.ch/',
    lat: 46.7132777,
    lon: 9.5576907,
    googlePlaceId: 'ChIJb1eUayR_hUcRaKrDKk_M4do',
  },
  {
    name: 'Ostschweizerischer Golfclub',
    city: 'Niederbüren',
    region: 'SG',
    postalCode: '9246',
    holes: 18,
    website: 'https://www.osgc.ch/',
    lat: 47.4713529,
    lon: 9.1948636,
    googlePlaceId: 'ChIJs6jhlS-jmkcRAYfVyV6d44U',
  },
  {
    name: 'Golfclub Riederalp',
    city: 'Riederalp',
    region: 'VS',
    postalCode: '3987',
    holes: 9,
    website: 'https://www.golfclub-riederalp.ch/',
    lat: 46.378063,
    lon: 8.033187999999999,
    googlePlaceId: 'ChIJFVmp2AY9j0cRj-tzl3N8QOQ',
  },
  {
    name: 'Golf Club Sierre',
    city: 'Granges',
    region: 'VS',
    postalCode: '3977',
    holes: 18,
    website: 'https://www.golfsierre.ch/',
    lat: 46.2546323,
    lon: 7.453998500000001,
    googlePlaceId: 'ChIJoT0W6r7pjkcRVvRSGwKtP64',
  },
  {
    name: 'Golf Club Thunersee',
    city: 'Thun',
    region: 'BE',
    postalCode: '3608',
    holes: 9,
    website: 'https://www.golfclub-thunersee.ch/',
    lat: 46.746565,
    lon: 7.596743999999998,
    googlePlaceId: 'ChIJszDT25V5j0cRn4uk3XRXqFE',
  },
  {
    name: 'Golf Club Zumikon',
    city: 'Zumikon',
    region: 'ZH',
    postalCode: '8126',
    holes: 18,
    website: 'https://www.gccz.ch/',
    lat: 47.335318,
    lon: 8.626083,
    googlePlaceId: 'ChIJNfp4kXAJkEcRKM26WLlgj0M',
  },
  {
    name: 'Golf Augwil',
    city: 'Lufingen-Augwil',
    region: 'ZH',
    postalCode: '8426',
    holes: 9,
    website: 'https://www.golfaugwil.ch/',
    lat: 47.4738755,
    lon: 8.6044505,
    googlePlaceId: 'ChIJgRJ1xzIGkEcR5n8NZJouJZg',
  },
  {
    name: 'Golf Grindelwald',
    city: 'Grindelwald',
    region: 'BE',
    postalCode: '3818',
    holes: 9,
    website: 'https://golf-grindelwald.ch/',
    lat: 46.6169635,
    lon: 8.0412825,
    googlePlaceId: 'ChIJy1T_yhr7j0cR8hFoSIXG1FM',
  },
  {
    name: 'Golf de la Vieille-Bâtie',
    city: 'Collex-Bossy',
    region: 'GE',
    postalCode: '1239',
    holes: 9,
    website: 'https://www.golf-vieille-batie.ch/',
    lat: 46.2899118,
    lon: 6.1191815,
    googlePlaceId: 'ChIJ89tALuNkjEcRY0bN4fQ-p6c',
  },
];

export function validateReviewedMissingChCourses(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const placeIds = new Set<string>();

  for (const course of REVIEWED_MISSING_CH_COURSES) {
    if (!course.name.trim()) errors.push('course name is required');
    if (names.has(course.name)) errors.push(`duplicate name: ${course.name}`);
    names.add(course.name);

    if (!course.googlePlaceId.trim()) {
      errors.push(`Google Place ID is required: ${course.name}`);
    } else if (placeIds.has(course.googlePlaceId)) {
      errors.push(`duplicate Google Place ID: ${course.googlePlaceId}`);
    }
    placeIds.add(course.googlePlaceId);

    if (course.lat < -90 || course.lat > 90) {
      errors.push(`latitude out of range: ${course.name}`);
    }
    if (course.lon < -180 || course.lon > 180) {
      errors.push(`longitude out of range: ${course.name}`);
    }
    if (!/^[0-9]{4}$/.test(course.postalCode)) {
      errors.push(`invalid Swiss postal code: ${course.name}`);
    }
  }

  return errors;
}
