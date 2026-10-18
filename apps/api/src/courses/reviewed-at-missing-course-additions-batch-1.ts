export type ReviewedAtMissingCourseAddition = {
  name: string;
  city: string;
  region: string;
  postalCode: string;
  holes: number;
  website: string;
  lat: number;
  lon: number;
  coordinateSource: string;
  evidenceUrl: string;
  googlePlaceId?: string;
};

export const REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1: ReviewedAtMissingCourseAddition[] = [
  {
    name: 'Golfclub Innsbruck-Igls – Golfplatz Lans',
    city: 'Lans',
    region: 'Tirol',
    postalCode: '6072',
    holes: 9,
    website: 'https://www.golfclub-innsbruck-igls.at/',
    lat: 47.2449,
    lon: 11.4265,
    coordinateSource: 'Golf World Map cross-checked against official course address',
    evidenceUrl: 'https://www.golfclub-innsbruck-igls.at/',
  },
  {
    name: 'Celtic Golf Course Schärding',
    city: 'Taufkirchen an der Pram',
    region: 'Oberösterreich',
    postalCode: '4775',
    holes: 18,
    website: 'https://www.gcschaerding.at/',
    lat: 48.3830505,
    lon: 13.5131329,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gcschaerding.at/',
    googlePlaceId: 'ChIJtYVbN0FodEcRFRa357OMr5w',
  },
  {
    name: 'Golfclub Guntramsdorf',
    city: 'Guntramsdorf',
    region: 'Niederösterreich',
    postalCode: '2353',
    holes: 9,
    website: 'https://www.golfguntramsdorf.at/',
    lat: 48.0343411,
    lon: 16.3623555,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golfguntramsdorf.at/',
    googlePlaceId: 'ChIJmXuGMfOtbUcR3HkBOtaX5-U',
  },
  {
    name: 'Golfclub Weitra',
    city: 'Weitra',
    region: 'Niederösterreich',
    postalCode: '3970',
    holes: 18,
    website: 'https://hausschachen.at/',
    lat: 48.6927358,
    lon: 14.8908769,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://hausschachen.at/',
    googlePlaceId: 'ChIJHVpmUjofc0cRRh4r8FXDd8o',
  },
  {
    name: 'Golf Grazer MurAuen',
    city: 'Gössendorf',
    region: 'Steiermark',
    postalCode: '8077',
    holes: 9,
    website: 'https://golf-graz.at/',
    lat: 47.0139361,
    lon: 15.47063,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://golf-graz.at/',
    googlePlaceId: 'ChIJ-csClNi0b0cRycIRp60eZNE',
  },
  {
    name: 'Golfclub Gut Brandlhof',
    city: 'Saalfelden',
    region: 'Salzburg',
    postalCode: '5760',
    holes: 18,
    website: 'https://www.brandlhof.com/golf/',
    lat: 47.4813547,
    lon: 12.8317169,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.brandlhof.com/golf/',
    googlePlaceId: 'ChIJ_4uJqtn6dkcRSuMCvI8c668',
  },
  {
    name: 'Golfclub Gut Freiberg',
    city: 'Gleisdorf',
    region: 'Steiermark',
    postalCode: '8200',
    holes: 18,
    website: 'https://www.gc-gut-freiberg.at/',
    lat: 47.1278302,
    lon: 15.6735647,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.gc-gut-freiberg.at/',
    googlePlaceId: 'ChIJqwO7DshPbkcRwQJghxJp0hM',
  },
  {
    name: 'Golf Eldorado Bucklige Welt',
    city: 'Zöbern',
    region: 'Niederösterreich',
    postalCode: '2871',
    holes: 18,
    website: 'https://www.golf1.at/',
    lat: 47.4843135,
    lon: 16.1481878,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golf1.at/',
    googlePlaceId: 'ChIJ2QxdyEiHbkcR3oEjFT2BRfE',
  },
  {
    name: 'Traminergolf Klöch',
    city: 'Klöch',
    region: 'Steiermark',
    postalCode: '8493',
    holes: 27,
    website: 'https://www.traminergolf.at/',
    lat: 46.7502256,
    lon: 15.9713093,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.traminergolf.at/',
    googlePlaceId: 'ChIJ3zVZBwhXd0cRn0sEa9d89I0',
  },
  {
    name: 'Golfclub Murau-Kreischberg',
    city: 'St. Georgen am Kreischberg',
    region: 'Steiermark',
    postalCode: '8861',
    holes: 18,
    website: 'https://www.golf-murau-kreischberg.com/',
    lat: 47.1133424,
    lon: 14.1779068,
    coordinateSource: 'Google Places discovery candidate',
    evidenceUrl: 'https://www.golf-murau-kreischberg.com/',
    googlePlaceId: 'ChIJRXAv3AJWcEcR8supVV6us98',
  },
];

export function validateReviewedAtMissingCourseAdditionsBatch1(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const placeIds = new Set<string>();

  for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1) {
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
    if (course.googlePlaceId) {
      if (placeIds.has(course.googlePlaceId)) {
        errors.push(`duplicate Google Place ID: ${course.googlePlaceId}`);
      }
      placeIds.add(course.googlePlaceId);
    }
  }

  for (let index = 0; index < REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1.length; index++) {
    const course = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1[index];
    for (
      let otherIndex = index + 1;
      otherIndex < REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1.length;
      otherIndex++
    ) {
      const other = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1[otherIndex];
      if (course.lat === other.lat && course.lon === other.lon) {
        errors.push(`duplicate coordinates: ${course.name} / ${other.name}`);
      }
    }
  }

  return errors;
}
