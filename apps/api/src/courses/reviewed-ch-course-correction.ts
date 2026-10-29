export const LANGENTHAL_DUPLICATE = {
  country: 'CH',
  name: 'Golf Club Langenthal',
  currentLat: 47.1313976,
  currentLon: 7.5053934,
} as const;

export const GOLF_EMMENTAL = {
  name: 'Golf Emmental',
  country: 'CH',
  region: 'BE',
  city: 'Oberburg',
  postalCode: '3414',
  lat: 47.03101182124836,
  lon: 7.631722233759894,
  holes: 18,
  par: 72,
  phone: '+41 34 424 10 30',
  website: 'https://www.golfemmental.ch/',
  source: 'manual_review',
  verified: true,
  active: true,
} as const;

export function coordinatesMatch(
  actualLat: number,
  actualLon: number,
  expectedLat: number,
  expectedLon: number,
): boolean {
  return (
    Math.abs(actualLat - expectedLat) <= 1e-8 &&
    Math.abs(actualLon - expectedLon) <= 1e-8
  );
}

export function isExpectedLangenthalDuplicate(course: {
  country: string;
  name: string;
  lat: number;
  lon: number;
}): boolean {
  return (
    course.country.toUpperCase() === LANGENTHAL_DUPLICATE.country &&
    course.name === LANGENTHAL_DUPLICATE.name &&
    coordinatesMatch(
      course.lat,
      course.lon,
      LANGENTHAL_DUPLICATE.currentLat,
      LANGENTHAL_DUPLICATE.currentLon,
    )
  );
}

export function validateGolfEmmentalDefinition(): string[] {
  const errors: string[] = [];

  if (GOLF_EMMENTAL.country !== 'CH') errors.push('country must be CH');
  if (!GOLF_EMMENTAL.name.trim()) errors.push('name is required');
  if (GOLF_EMMENTAL.lat < -90 || GOLF_EMMENTAL.lat > 90) {
    errors.push('latitude is out of range');
  }
  if (GOLF_EMMENTAL.lon < -180 || GOLF_EMMENTAL.lon > 180) {
    errors.push('longitude is out of range');
  }
  if (GOLF_EMMENTAL.holes !== 18) errors.push('holes must be 18');
  if (GOLF_EMMENTAL.par !== 72) errors.push('par must be 72');

  return errors;
}
