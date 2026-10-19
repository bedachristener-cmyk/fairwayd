export const REVIEWED_TH_BARCELONA_VALLEY_COURSES = [
  {
    id: 'cmoybno310003a8uw16zmwtu7',
    expectedNames: [
      'Barcelona Valley Golf Club',
      'Barcelona Valley - Valley Course (Rayong Green Valley)',
    ],
    name: 'Barcelona Valley - Valley Course (Rayong Green Valley)',
    lat: 12.813468,
    lon: 101.0681995,
    evidence: 'Google Places Rayong Green Valley marker and current Barcelona Valley course branding',
  },
  {
    id: 'cmlsg0cp5013gbkuwd9t37q0y',
    expectedNames: [
      'St. Andrews 2000 Golf Club',
      'Barcelona Valley - Lake Course (St. Andrews 2000)',
    ],
    name: 'Barcelona Valley - Lake Course (St. Andrews 2000)',
    lat: 12.8134927,
    lon: 101.068222,
    evidence: 'Google Places St. Andrews 2000 marker and current Barcelona Valley Lake Course branding',
  },
  {
    id: 'cmoybnp5m001ia8uwnrf3ntyq',
    expectedNames: [
      'Silky Oak Country Club',
      'Barcelona Valley - Mountain Course (Silky Oak)',
    ],
    name: 'Barcelona Valley - Mountain Course (Silky Oak)',
    lat: 12.80936,
    lon: 101.0580433,
    evidence: 'Google Places Silky Oak marker and current Barcelona Valley Mountain Course branding',
  },
] as const;

export function validateReviewedThBarcelonaValleyCourses(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const course of REVIEWED_TH_BARCELONA_VALLEY_COURSES) {
    if (ids.has(course.id)) errors.push(`duplicate id: ${course.id}`);
    ids.add(course.id);

    const normalizedName = course.name.toLocaleLowerCase();
    if (names.has(normalizedName)) errors.push(`duplicate name: ${course.name}`);
    names.add(normalizedName);

    if (!course.expectedNames.includes(course.name)) {
      errors.push(`final name is not accepted for id=${course.id}`);
    }
    if (
      !Number.isFinite(course.lat) ||
      !Number.isFinite(course.lon) ||
      course.lat < -90 ||
      course.lat > 90 ||
      course.lon < -180 ||
      course.lon > 180
    ) {
      errors.push(`invalid coordinates for id=${course.id}`);
    }
  }

  if (REVIEWED_TH_BARCELONA_VALLEY_COURSES.length !== 3) {
    errors.push('expected exactly three independently searchable courses');
  }

  return errors;
}
