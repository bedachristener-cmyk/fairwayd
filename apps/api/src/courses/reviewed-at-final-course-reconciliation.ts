import type { ReviewedAtMissingCourseAddition } from './reviewed-at-missing-course-additions-batch-1';

export type ReviewedAtFinalExclusion = {
  discoveryName: string;
  reason: string;
  evidenceUrl: string;
};

export const REVIEWED_AT_FINAL_COURSE_ADDITIONS: ReviewedAtMissingCourseAddition[] = [
  {
    name: 'Golfclub Salzburg – Golfacademy Rif',
    city: 'Hallein',
    region: 'Salzburg',
    postalCode: '5400',
    holes: 9,
    website: 'https://www.golfclub-rif.at/',
    lat: 47.7193307,
    lon: 13.0667263,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.golfclub-rif.at/',
    googlePlaceId: 'ChIJKQMP1feTdkcRcweaCWBxq2M',
  },
  {
    name: 'Golfclub GolfMaxX',
    city: 'Langenzersdorf',
    region: 'Niederösterreich',
    postalCode: '2103',
    holes: 9,
    website: 'https://www.golfmaxx.at/',
    lat: 48.322565,
    lon: 16.340419,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.golfmaxx.at/',
    googlePlaceId: 'ChIJx1FdLKwPbUcRZTesMYBCR70',
  },
  {
    name: 'Golfclub Tuttendörfl',
    city: 'Langenzersdorf',
    region: 'Niederösterreich',
    postalCode: '2103',
    holes: 9,
    website: 'https://www.gctuttendoerfl.at/',
    lat: 48.3260321,
    lon: 16.341383,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.gctuttendoerfl.at/',
    googlePlaceId: 'ChIJFfF8E64PbUcRQX1GIuSwiTk',
  },
  {
    name: 'Golfclub Waldhof',
    city: 'Fuschl am See',
    region: 'Salzburg',
    postalCode: '5330',
    holes: 9,
    website: 'https://www.golfclub-waldhof.at/',
    lat: 47.8041667,
    lon: 13.3001861,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.golfclub-waldhof.at/',
    googlePlaceId: 'ChIJ-XRtakKjdkcROXDVc8UMHPo',
  },
  {
    name: 'Öko Golf Neusiedler Csarda',
    city: 'Neusiedl am See',
    region: 'Burgenland',
    postalCode: '7100',
    holes: 9,
    website: 'https://www.xn--ko-golf-neusiedler-csarda-xrc.at/',
    lat: 47.9518257,
    lon: 16.8198299,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.xn--ko-golf-neusiedler-csarda-xrc.at/',
    googlePlaceId: 'ChIJpdJWp89CbEcR_20Es7_cwiY',
  },
  {
    name: 'Golfpark & Trainingszentrum Waidhofen/Thaya',
    city: 'Waidhofen an der Thaya',
    region: 'Niederösterreich',
    postalCode: '3830',
    holes: 3,
    website: 'https://golfklinik.at/',
    lat: 48.8195299,
    lon: 15.3041371,
    coordinateSource: 'Google Places discovery candidate cross-checked against current operator website',
    evidenceUrl: 'https://golfklinik.at/',
    googlePlaceId: 'ChIJz6lqWMPFckcR1QLQgJzIq6E',
  },
  {
    name: 'Golf-Club Arlberg',
    city: 'St. Anton am Arlberg',
    region: 'Tirol',
    postalCode: '6580',
    holes: 9,
    website: 'https://www.golfarlberg.at/',
    lat: 47.13443,
    lon: 10.2705757,
    coordinateSource: 'Google Places discovery candidate cross-checked against official course website',
    evidenceUrl: 'https://www.golfarlberg.at/de/golfplatz/',
    googlePlaceId: 'ChIJ49A1I26wnEcRMLiYYdFAixU',
  },
];

export const REVIEWED_AT_FINAL_EXCLUSIONS: ReviewedAtFinalExclusion[] = [
  {
    discoveryName: 'Citygolf Vienna',
    reason: 'same operated Golfpark Vienna site as the active Golf Club Wien-Süßenbrunn marker',
    evidenceUrl: 'https://golfpark-vienna.at/plaetze/',
  },
  {
    discoveryName: 'Golfschule Rif',
    reason: 'same physical facility as Golfclub Salzburg – Golfacademy Rif',
    evidenceUrl: 'https://www.golfclub-rif.at/',
  },
  {
    discoveryName: 'Golfsport Maria Taferl GmbH & Co KEG',
    reason: 'discovery name and address conflict; no current outdoor golf facility could be verified',
    evidenceUrl: 'https://www.golf.at/',
  },
  {
    discoveryName: 'SwinGolf Böhmerwald',
    reason: 'facility variant at the already represented Golfpark Böhmerwald site',
    evidenceUrl: 'https://www.boehmerwaldgolf.at/',
  },
];

export function validateReviewedAtFinalCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const placeIds = new Set<string>();
  const coordinates = new Set<string>();

  for (const course of REVIEWED_AT_FINAL_COURSE_ADDITIONS) {
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

  const exclusionNames = new Set<string>();
  for (const exclusion of REVIEWED_AT_FINAL_EXCLUSIONS) {
    if (!exclusion.discoveryName || !exclusion.reason) {
      errors.push('complete exclusion documentation is required');
    }
    if (exclusionNames.has(exclusion.discoveryName)) {
      errors.push(`duplicate exclusion: ${exclusion.discoveryName}`);
    }
    exclusionNames.add(exclusion.discoveryName);
    if (!exclusion.evidenceUrl.startsWith('https://')) {
      errors.push(`HTTPS exclusion evidence is required: ${exclusion.discoveryName}`);
    }
  }

  return errors;
}
