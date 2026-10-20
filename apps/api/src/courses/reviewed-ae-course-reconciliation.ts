export type ReviewedAeCourseUpdate = {
  expectedNames: readonly string[];
  name: string;
  city: string;
  region: string;
  holes: number;
  lat: number;
  lon: number;
  evidence: string;
};

export type ReviewedAeCourseAddition = {
  name: string;
  city: string;
  region: string;
  holes: number;
  lat: number;
  lon: number;
  evidence: string;
  placeId: string;
  sharedFacilityGroup?: string;
};

export type ReviewedAeCourseExclusion = {
  name: string;
  reason: string;
  businessStatus: 'CLOSED_PERMANENTLY';
  placeId: string;
};

export const REVIEWED_AE_COURSE_UPDATES: ReviewedAeCourseUpdate[] = [
  {
    expectedNames: ['Abu Dhabi Golf Club', 'Abu Dhabi Golf Club - National Course'],
    name: 'Abu Dhabi Golf Club - National Course',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 18,
    lat: 24.4202937,
    lon: 54.5268816,
    evidence: 'Official EGF inventory and Google Places verified club marker',
  },
  {
    expectedNames: ['Arabian Ranches Golf Club'],
    name: 'Arabian Ranches Golf Club',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0515283,
    lon: 55.2686857,
    evidence: 'Official EGF inventory and Google Places verified club marker',
  },
  {
    expectedNames: ['Dubai Creek Golf & Yacht Club'],
    name: 'Dubai Creek Golf & Yacht Club',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.2416925,
    lon: 55.3335252,
    evidence: 'Official EGF inventory and Google Places verified course marker',
  },
  {
    expectedNames: ['Emirates Golf Club', 'Emirates Golf Club - Majlis Course'],
    name: 'Emirates Golf Club - Majlis Course',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0857799,
    lon: 55.159387,
    evidence: 'Official independently named Majlis course and Google Places marker',
  },
  {
    expectedNames: ['Jumeirah Golf Estates', 'Jumeirah Golf Estates - Earth Course'],
    name: 'Jumeirah Golf Estates - Earth Course',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0178137,
    lon: 55.1960709,
    evidence: 'Official independently named Earth course and Google Places marker',
  },
  {
    expectedNames: ['Saadiyat Beach Golf Club'],
    name: 'Saadiyat Beach Golf Club',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 18,
    lat: 24.5427319,
    lon: 54.4391246,
    evidence: 'Official EGF inventory and Google Places verified course marker',
  },
  {
    expectedNames: ['The Els Club Dubai'],
    name: 'The Els Club Dubai',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0312786,
    lon: 55.2180236,
    evidence: 'Official EGF inventory and Google Places verified course marker',
  },
  {
    expectedNames: ['Trump International Golf Club Dubai'],
    name: 'Trump International Golf Club Dubai',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0245454,
    lon: 55.2540599,
    evidence: 'Official EGF inventory and Google Places verified course marker',
  },
  {
    expectedNames: ['Yas Links Abu Dhabi'],
    name: 'Yas Links Abu Dhabi',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 18,
    lat: 24.4782909,
    lon: 54.5999684,
    evidence: 'Official EGF inventory and Google Places verified course marker',
  },
];

export const REVIEWED_AE_COURSE_ADDITIONS: ReviewedAeCourseAddition[] = [
  {
    name: 'Abu Dhabi City Golf Club',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 9,
    lat: 24.4432779,
    lon: 54.3819826,
    evidence: 'Official EGF inventory and Google Places verified course marker',
    placeId: 'ChIJ1-HJSvNoXj4Rw19B_D7NO-Q',
  },
  {
    name: 'Abu Dhabi Golf Club - Garden Course',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 9,
    lat: 24.4119996,
    lon: 54.5314685,
    evidence: 'Official independently named Garden course and Google Places marker',
    placeId: 'ChIJMaQBj-BHXj4R2vkqqG2z848',
    sharedFacilityGroup: 'abu-dhabi-golf-club',
  },
  {
    name: 'Al Ain Equestrian, Shooting & Golf Club',
    city: 'Al Ain',
    region: 'Abu Dhabi',
    holes: 27,
    lat: 24.1846658,
    lon: 55.6585018,
    evidence: 'Official EGF inventory and Google Places verified facility marker',
    placeId: 'ChIJnUhM0zCuij4RhgcN_mVJ97w',
  },
  {
    name: 'Al Dhannah Golf Club',
    city: 'Al Dhannah City',
    region: 'Abu Dhabi',
    holes: 9,
    lat: 24.0726215,
    lon: 52.6348467,
    evidence: 'Official club site, EGF inventory and Google Places verified marker',
    placeId: 'ChIJ1f0A7LbVQj4RnSomsgcIk2I',
  },
  {
    name: 'Al Ghazal Golf Club',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 18,
    lat: 24.4188938,
    lon: 54.6456501,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJg7Ye8vpIXj4RpphZ-iWKYIg',
  },
  {
    name: 'Yas Acres Golf & Country Club',
    city: 'Abu Dhabi',
    region: 'Abu Dhabi',
    holes: 9,
    lat: 24.4967768,
    lon: 54.6147444,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJxRi0eahPXj4R6wIvjGV-fZY',
  },
  {
    name: 'Dubai Hills Golf Club',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.1214015,
    lon: 55.2637716,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJmSb06oNpXz4RahtrIz1Onu0',
  },
  {
    name: 'Emirates Golf Club - Faldo Course',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0853152,
    lon: 55.1598381,
    evidence: 'Official independently named Faldo course and Google Places club marker',
    placeId: 'ChIJHWIfwmFrXz4R1y80xJaY2vI',
    sharedFacilityGroup: 'emirates-golf-club',
  },
  {
    name: 'JA The Resort Golf Course',
    city: 'Dubai',
    region: 'Dubai',
    holes: 9,
    lat: 24.9869284,
    lon: 55.0256768,
    evidence: 'Official EGF inventory and Google Places Jebel Ali course marker',
    placeId: 'ChIJ-yI1sf8RXz4RH1TTkNXNtwI',
  },
  {
    name: 'Jumeirah Golf Estates - Fire Course',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0209208,
    lon: 55.2001963,
    evidence: 'Official independently named Fire course and Google Places facility marker',
    placeId: 'ChIJDeq1BJJtXz4RdHBsKTDHTpw',
    sharedFacilityGroup: 'jumeirah-golf-estates',
  },
  {
    name: 'The Montgomerie Dubai',
    city: 'Dubai',
    region: 'Dubai',
    holes: 18,
    lat: 25.0673503,
    lon: 55.1642136,
    evidence: 'Official EGF inventory and Google Places golf-club marker; academy alias excluded',
    placeId: 'ChIJsTbbzpVsXz4RV5iQkOQeDuQ',
  },
  {
    name: 'The Track, Meydan Golf',
    city: 'Dubai',
    region: 'Dubai',
    holes: 9,
    lat: 25.1668293,
    lon: 55.312854,
    evidence: 'Official EGF inventory and Google Places verified course marker',
    placeId: 'ChIJZbc_wH9oXz4R8kiuqhUlzYY',
  },
  {
    name: 'Al Hamra Golf Club',
    city: 'Ras Al Khaimah',
    region: 'Ras Al Khaimah',
    holes: 18,
    lat: 25.6896584,
    lon: 55.7771601,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJ_-Uavz8K9j4RHDOaGQB_NbE',
  },
  {
    name: 'Al Zorah Golf & Yacht Club',
    city: 'Ajman',
    region: 'Ajman',
    holes: 18,
    lat: 25.4318862,
    lon: 55.4875919,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJXVH71Qv49T4RH9YdVVZijGc',
  },
  {
    name: 'Sharjah Golf & Shooting Club',
    city: 'Sharjah',
    region: 'Sharjah',
    holes: 9,
    lat: 25.3547578,
    lon: 55.4867215,
    evidence: 'Official UAE inventory and Google Places verified club marker',
    placeId: 'ChIJVVVVcphYXz4Rit0ryznB7Mg',
  },
  {
    name: 'Tower Links Golf Club',
    city: 'Ras Al Khaimah',
    region: 'Ras Al Khaimah',
    holes: 18,
    lat: 25.763337,
    lon: 55.956328,
    evidence: 'Official EGF inventory and Google Places verified club marker',
    placeId: 'ChIJc9YlQLx29j4RceTHX3orDC8',
  },
];

export const REVIEWED_AE_COURSE_EXCLUSIONS: ReviewedAeCourseExclusion[] = [
  {
    name: 'Al Dhafra Golf Club',
    reason: 'Google Places marks the historical Al Ruwais sand course permanently closed',
    businessStatus: 'CLOSED_PERMANENTLY',
    placeId: 'ChIJOZLJTmgqQz4R-cwdRb3jJfg',
  },
];

export function validateReviewedAeCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const course of REVIEWED_AE_COURSE_UPDATES) {
    if (!course.expectedNames.includes(course.name)) {
      errors.push(`final name not accepted: ${course.name}`);
    }
    validateCourse(course, names, errors);
  }
  for (const course of REVIEWED_AE_COURSE_ADDITIONS) {
    if (!course.placeId.trim()) errors.push(`missing place id: ${course.name}`);
    validateCourse(course, names, errors);
  }

  if (REVIEWED_AE_COURSE_UPDATES.length !== 9) {
    errors.push('expected exactly nine protected existing-course updates');
  }
  if (REVIEWED_AE_COURSE_ADDITIONS.length !== 16) {
    errors.push('expected exactly sixteen reviewed additions');
  }
  if (
    REVIEWED_AE_COURSE_EXCLUSIONS.length !== 1 ||
    REVIEWED_AE_COURSE_EXCLUSIONS[0].name !== 'Al Dhafra Golf Club'
  ) {
    errors.push('expected Al Dhafra as the single reviewed closed-course exclusion');
  }

  return errors;
}

function validateCourse(
  course: { name: string; holes: number; lat: number; lon: number },
  names: Set<string>,
  errors: string[],
) {
  const normalizedName = course.name.toLocaleLowerCase();
  if (names.has(normalizedName)) errors.push(`duplicate final name: ${course.name}`);
  names.add(normalizedName);

  if (!Number.isInteger(course.holes) || course.holes <= 0) {
    errors.push(`invalid holes: ${course.name}`);
  }
  if (
    !Number.isFinite(course.lat) ||
    !Number.isFinite(course.lon) ||
    course.lat < 22 ||
    course.lat > 27 ||
    course.lon < 51 ||
    course.lon > 57
  ) {
    errors.push(`coordinates outside UAE review bounds: ${course.name}`);
  }
}
