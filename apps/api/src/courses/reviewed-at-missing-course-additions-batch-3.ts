import type { ReviewedAtMissingCourseAddition } from './reviewed-at-missing-course-additions-batch-1';

export const REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3: ReviewedAtMissingCourseAddition[] = [
  {
    name: 'Golfclub Salzburg – Championcourse Eugendorf',
    city: 'Eugendorf',
    region: 'Salzburg',
    postalCode: '5301',
    holes: 18,
    website: 'https://www.golf-eugendorf.at/',
    lat: 47.869431,
    lon: 13.151177,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golf-eugendorf.at/',
    googlePlaceId: 'ChIJD0ioq0aZdkcRles_nY38b8I',
  },
  {
    name: 'Golfclub Schloss Feistritz',
    city: 'Krieglach',
    region: 'Steiermark',
    postalCode: '8670',
    holes: 9,
    website: 'https://www.golfclub-schloss-feistritz.at/',
    lat: 47.5630469,
    lon: 15.5822012,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golfclub-schloss-feistritz.at/',
    googlePlaceId: 'ChIJCT35U8gObkcR-SfSe-SUYM0',
  },
  {
    name: 'Golfclub Walchsee-Moarhof',
    city: 'Walchsee',
    region: 'Tirol',
    postalCode: '6344',
    holes: 9,
    website: 'https://www.moarhof.at/',
    lat: 47.6612459,
    lon: 12.2949952,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.moarhof.at/',
    googlePlaceId: 'ChIJw9L8TqeahacROW-JCS-j1sI',
  },
  {
    name: 'Golfclub Achau',
    city: 'Achau',
    region: 'Niederösterreich',
    postalCode: '2481',
    holes: 9,
    website: 'https://www.gcachau.at/',
    lat: 48.081126,
    lon: 16.36776,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcachau.at/',
    googlePlaceId: 'ChIJv_afRySsbUcRipPZuzMn5Io',
  },
  {
    name: 'Golfclub Schwechat',
    city: 'Schwechat',
    region: 'Niederösterreich',
    postalCode: '2320',
    holes: 9,
    website: 'https://www.gcschwechat.at/',
    lat: 48.129738,
    lon: 16.499,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcschwechat.at/',
    googlePlaceId: 'ChIJL1D88dWqbUcRk9uDPPG11ZY',
  },
  {
    name: 'Golfplatz Breitenfurt',
    city: 'Breitenfurt bei Wien',
    region: 'Niederösterreich',
    postalCode: '2384',
    holes: 9,
    website: 'https://www.golf-breitenfurt.at/',
    lat: 48.132377,
    lon: 16.1764224,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golf-breitenfurt.at/',
    googlePlaceId: 'ChIJW6i1xp4HbUcRF1juZ2xEnV0',
  },
  {
    name: 'Golfclub Graz-Andritz St. Gotthard',
    city: 'Graz',
    region: 'Steiermark',
    postalCode: '8046',
    holes: 9,
    website: 'https://www.golf-andritz.at/',
    lat: 47.110597,
    lon: 15.4068769,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golf-andritz.at/',
    googlePlaceId: 'ChIJ9_tlBiw0bkcRk6mBuLoZxio',
  },
  {
    name: 'Golfzentrum Bruck/Mur',
    city: 'Bruck an der Mur',
    region: 'Steiermark',
    postalCode: '8600',
    holes: 9,
    website: 'https://www.golfbruck.at/',
    lat: 47.4034479,
    lon: 15.2274518,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golfbruck.at/',
    googlePlaceId: 'ChIJaQm97rwfbkcR5oo1XsUOB8Q',
  },
  {
    name: 'Open Golf St. Johann Alpendorf',
    city: 'St. Johann im Pongau',
    region: 'Salzburg',
    postalCode: '5600',
    holes: 18,
    website: 'https://www.golfsanktjohann.at/',
    lat: 47.380587,
    lon: 13.217874,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golfsanktjohann.at/',
    googlePlaceId: 'ChIJfYuxBPjZdkcRmABpDqyA9mg',
  },
  {
    name: 'Golfclub Grebenzen-Mariahof',
    city: 'Mariahof',
    region: 'Steiermark',
    postalCode: '8812',
    holes: 18,
    website: 'https://www.gc-mariahof.at/',
    lat: 47.107411,
    lon: 14.371142,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gc-mariahof.at/',
    googlePlaceId: 'ChIJA4xbNAlScEcRZDvLdQNXEhY',
  },
];

export function validateReviewedAtMissingCourseAdditionsBatch3(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const placeIds = new Set<string>();
  const coordinates = new Set<string>();

  for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3) {
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
