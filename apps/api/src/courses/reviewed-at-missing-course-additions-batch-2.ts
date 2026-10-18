import type { ReviewedAtMissingCourseAddition } from './reviewed-at-missing-course-additions-batch-1';

export const REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2: ReviewedAtMissingCourseAddition[] = [
  {
    name: 'Defereggental Golf Park',
    city: 'St. Veit in Defereggen',
    region: 'Tirol',
    postalCode: '9962',
    holes: 9,
    website: 'https://www.hotel-defereggental.com/golf-park/9-loch-golfplatz',
    lat: 46.9148757,
    lon: 12.3753242,
    coordinateSource: 'Google Places discovery candidate at the official Bruggen 84 facility',
    evidenceUrl:
      'https://www.hotel-defereggental.com/golf-park/9-loch-golfplatz',
    googlePlaceId: 'ChIJsX18du2Dd0cRK_NZHaDFYCI',
  },
  {
    name: 'Golfclub Bockfließ',
    city: 'Bockfließ',
    region: 'Niederösterreich',
    postalCode: '2213',
    holes: 18,
    website: 'https://www.gcbockfliess.at/',
    lat: 48.328571,
    lon: 16.583179,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcbockfliess.at/',
    googlePlaceId: 'ChIJocEnkTEdbUcR9-4V2g-dcvY',
  },
  {
    name: 'Golfclub Kitzbüheler Alpen Westendorf',
    city: 'Westendorf',
    region: 'Tirol',
    postalCode: '6363',
    holes: 18,
    website: 'https://www.gc-kitzbueheler-alpen.at/',
    lat: 47.42435,
    lon: 12.19991,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gc-kitzbueheler-alpen.at/',
    googlePlaceId: 'ChIJ--NzMrhKdkcROZtqlCtQwbM',
  },
  {
    name: 'Golfclub Klockerhof',
    city: 'Hart bei Graz',
    region: 'Steiermark',
    postalCode: '8075',
    holes: 9,
    website: 'https://www.moderngolf.at/',
    lat: 47.0525633,
    lon: 15.5256544,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.moderngolf.at/',
    googlePlaceId: 'ChIJ3TgzfXFLbkcRDwbJ6i9mIUA',
  },
  {
    name: 'Golfclub Pfarrkirchen im Mühlviertel',
    city: 'Pfarrkirchen im Mühlkreis',
    region: 'Oberösterreich',
    postalCode: '4141',
    holes: 9,
    website: 'https://www.gcpfarrkirchen.at/',
    lat: 48.5019641,
    lon: 13.8232886,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcpfarrkirchen.at/',
    googlePlaceId: 'ChIJ_Wau9Kd9dEcRC0Pvilyqy8I',
  },
  {
    name: 'Golfclub Pischelsdorf – Gut Kaltenhausen',
    city: 'Pischelsdorf am Engelbach',
    region: 'Oberösterreich',
    postalCode: '5233',
    holes: 24,
    website: 'https://www.golfclub-pischelsdorf.at/',
    lat: 48.127339,
    lon: 13.115157,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golfclub-pischelsdorf.at/',
    googlePlaceId: 'ChIJKfJrSN8vdEcRnDj6ECh1MZs',
  },
  {
    name: 'Golfclub Reiting-Trofaiach',
    city: 'Trofaiach',
    region: 'Steiermark',
    postalCode: '8793',
    holes: 18,
    website: 'https://www.reiting-trofaiach.at/',
    lat: 47.4219485,
    lon: 14.9588312,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.reiting-trofaiach.at/',
    googlePlaceId: 'ChIJkSNXnBvocUcRyuCQkJzhMKA',
  },
  {
    name: 'Golfclub Römergolf',
    city: 'Eugendorf',
    region: 'Salzburg',
    postalCode: '5301',
    holes: 27,
    website: 'https://www.roemergolf.at/',
    lat: 47.8584943,
    lon: 13.1925955,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.roemergolf.at/',
    googlePlaceId: 'ChIJZRi5md2YdkcRSX12NIQliwk',
  },
  {
    name: 'Golfclub Schloss Ebreichsdorf',
    city: 'Ebreichsdorf',
    region: 'Niederösterreich',
    postalCode: '2483',
    holes: 18,
    website: 'https://www.gcebreichsdorf.at/',
    lat: 47.9709604,
    lon: 16.3950286,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcebreichsdorf.at/',
    googlePlaceId: 'ChIJ7x7wGzyzbUcRgaXoodPqoD4',
  },
  {
    name: 'Golfclub Tiroler Zugspitze',
    city: 'Ehrwald',
    region: 'Tirol',
    postalCode: '6632',
    holes: 9,
    website: 'https://www.tiroler-zugspitzgolf.at/',
    lat: 47.4039917,
    lon: 10.9039661,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.tiroler-zugspitzgolf.at/',
    googlePlaceId: 'ChIJUS3R7Sz9nEcR1mmcF4bgV10',
  },
];

export function validateReviewedAtMissingCourseAdditionsBatch2(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const placeIds = new Set<string>();
  const coordinates = new Set<string>();

  for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2) {
    if (!course.name.trim()) errors.push('course name is required');
    if (names.has(course.name)) errors.push(`duplicate name: ${course.name}`);
    names.add(course.name);

    if (!course.city || !course.region || !/^[0-9]{4}$/.test(course.postalCode)) {
      errors.push(`complete Austrian address metadata is required: ${course.name}`);
    }
    if (!Number.isInteger(course.holes) || course.holes < 1 || course.holes > 72) {
      errors.push(`invalid hole count: ${course.name}`);
    }
    if (!course.website.startsWith('https://')) {
      errors.push(`HTTPS website is required: ${course.name}`);
    }
    if (!course.coordinateSource || !course.evidenceUrl.startsWith('https://')) {
      errors.push(`review evidence is required: ${course.name}`);
    }
    if (
      course.lat < -90 ||
      course.lat > 90 ||
      course.lon < -180 ||
      course.lon > 180
    ) {
      errors.push(`coordinates out of range: ${course.name}`);
    }

    const coordinateKey = `${course.lat},${course.lon}`;
    if (coordinates.has(coordinateKey)) {
      errors.push(`duplicate coordinates: ${course.name}`);
    }
    coordinates.add(coordinateKey);

    if (course.googlePlaceId) {
      if (placeIds.has(course.googlePlaceId)) {
        errors.push(`duplicate Google Place ID: ${course.googlePlaceId}`);
      }
      placeIds.add(course.googlePlaceId);
    }
  }

  return errors;
}
