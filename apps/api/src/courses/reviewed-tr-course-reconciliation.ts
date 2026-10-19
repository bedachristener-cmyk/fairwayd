export type ReviewedTrCourseUpdate = {
  id: string;
  expectedNames: readonly string[];
  name: string;
  city: string;
  region: string;
  holes: number;
  lat: number;
  lon: number;
  evidence: string;
};

export type ReviewedTrCourseAddition = {
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

export const REVIEWED_TR_COURSE_UPDATES: ReviewedTrCourseUpdate[] = [
  {
    id: 'day108_tr_antalya_golf_club_pga_sultan',
    expectedNames: ['Antalya Golf Club PGA Sultan', 'Antalya Golf Club - PGA Sultan'],
    name: 'Antalya Golf Club - PGA Sultan',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8671,
    lon: 30.993154,
    evidence: 'Google Places Antalya Golf Club marker and official independently named PGA Sultan course',
  },
  {
    id: 'day108_tr_antalya_golf_club_pasha',
    expectedNames: ['Antalya Golf Club Pasha', 'Antalya Golf Club - The Pasha'],
    name: 'Antalya Golf Club - The Pasha',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8671,
    lon: 30.993154,
    evidence: 'Google Places Antalya Golf Club marker and official independently named Pasha course',
  },
  {
    id: 'day108_tr_carya_golf_club',
    expectedNames: ['Carya Golf Club'],
    name: 'Carya Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8654621,
    lon: 31.0095291,
    evidence: 'Google Places verified course marker',
  },
  {
    id: 'day108_tr_cornelia_golf_club',
    expectedNames: ['Cornelia Golf Club', 'Cornelia Faldo Golf Club'],
    name: 'Cornelia Faldo Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 27,
    lat: 36.8590825,
    lon: 31.0476896,
    evidence: 'Google Places verified club marker; Prince and Queen are combinations of the same 27-hole facility',
  },
  {
    id: 'day108_tr_gloria_golf_club',
    expectedNames: ['Gloria Golf Club', 'Gloria Golf Club - Old Course'],
    name: 'Gloria Golf Club - Old Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8522183,
    lon: 31.0965668,
    evidence: 'Official Gloria Old Course and Google Places club marker',
  },
  {
    id: 'day108_tr_kaya_palazzo_golf_club',
    expectedNames: ['Kaya Palazzo Golf Club'],
    name: 'Kaya Palazzo Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8602793,
    lon: 30.9995637,
    evidence: 'Google Places verified facility marker',
  },
  {
    id: 'day108_tr_montgomerie_maxx_royal',
    expectedNames: ['Montgomerie Maxx Royal', 'Montgomerie Maxx Royal Golf Club'],
    name: 'Montgomerie Maxx Royal Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.85363,
    lon: 31.0671939,
    evidence: 'Google Places verified course marker',
  },
  {
    id: 'day108_tr_national_golf_club',
    expectedNames: ['National Golf Club'],
    name: 'National Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8720402,
    lon: 30.9860212,
    evidence: 'Official National Golf Club and Google Places verified course marker',
  },
  {
    id: 'day108_tr_sueno_golf_club',
    expectedNames: ['Sueno Golf Club', 'Sueno Golf Club - Pines Course'],
    name: 'Sueno Golf Club - Pines Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8604726,
    lon: 31.0289295,
    evidence: 'Official Sueno Pines course and Google Places verified marker',
  },
  {
    id: 'day108_tr_titanic_golf_club',
    expectedNames: ['Titanic Golf Club', 'Cullinan Links - Aspendos Course'],
    name: 'Cullinan Links - Aspendos Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8628375,
    lon: 30.9720092,
    evidence: 'Current Cullinan Links identity; former Titanic facility; official Aspendos layout',
  },
];

export const REVIEWED_TR_COURSE_ADDITIONS: ReviewedTrCourseAddition[] = [
  {
    name: 'Cullinan Links - Olympos Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8628375,
    lon: 30.9720092,
    evidence: 'Official second independently named 18-hole Cullinan Links layout',
    placeId: 'ChIJHYrIS3B5wxQRrfgo87nQ3dk',
    sharedFacilityGroup: 'cullinan-links',
  },
  {
    name: 'Gloria Golf Club - New Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8522183,
    lon: 31.0965668,
    evidence: 'Official independently named 18-hole Gloria New Course',
    placeId: 'ChIJjd2JBqRkwxQRXuCVbIMwtTg',
    sharedFacilityGroup: 'gloria-golf',
  },
  {
    name: 'Gloria Golf Club - Verde Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 9,
    lat: 36.8432976,
    lon: 31.1082762,
    evidence: 'Official independently named 9-hole Gloria Verde Course and Google Places marker',
    placeId: 'ChIJI710UKRlwxQRV1slFvo30OU',
    sharedFacilityGroup: 'gloria-golf',
  },
  {
    name: 'Lykia Links Golf Club',
    city: 'Manavgat',
    region: 'Antalya',
    holes: 18,
    lat: 36.832689,
    lon: 31.188585,
    evidence: 'Google Places verified course marker and current Belek course inventory',
    placeId: 'ChIJr9odgkthwxQR3bg0waXciOo',
  },
  {
    name: 'Robinson Nobilis Golf Club',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8419853,
    lon: 31.1168204,
    evidence: 'Turkish Golf Federation inventory and Google Places verified course marker',
    placeId: 'ChIJY8nS6shlwxQR_H98zQtUi-k',
  },
  {
    name: 'Sueno Golf Club - Dunes Course',
    city: 'Belek',
    region: 'Antalya',
    holes: 18,
    lat: 36.8618428,
    lon: 31.0289285,
    evidence: 'Official independently named Sueno Dunes course and Google Places verified marker',
    placeId: 'ChIJ999RYi97wxQRmh1mHmoObh8',
    sharedFacilityGroup: 'sueno-golf',
  },
  {
    name: 'Ankara Golf Club - Ahlatlibel',
    city: 'Ankara',
    region: 'Ankara',
    holes: 9,
    lat: 39.843075,
    lon: 32.789029,
    evidence: 'Turkish Golf Federation inventory and Google Places verified facility marker',
    placeId: 'ChIJsQp77CxB0xQRuvFmHniBAbY',
  },
  {
    name: 'Regnum Golf Country Ankara',
    city: 'Gölbaşı',
    region: 'Ankara',
    holes: 18,
    lat: 39.6841005,
    lon: 32.5990484,
    evidence: 'Turkish Golf Federation inventory and Google Places verified course marker',
    placeId: 'ChIJF85FV2AR0xQRbT0R9hcM0Ok',
  },
  {
    name: 'Ataşehir Golf Club',
    city: 'İstanbul',
    region: 'İstanbul',
    holes: 6,
    lat: 40.9907112,
    lon: 29.1413784,
    evidence: 'Turkish Golf Federation inventory and Google Places verified facility marker',
    placeId: 'ChIJobOZfVTPyhQR5h55GxoX2Yg',
  },
  {
    name: 'Bodrum Golf & Tennis Club',
    city: 'Bodrum',
    region: 'Muğla',
    holes: 9,
    lat: 37.0537147,
    lon: 27.3409557,
    evidence: 'Turkish Golf Federation inventory and Google Places verified course marker',
    placeId: 'ChIJD-migWlyvhQR2e1iBpRXtXo',
  },
  {
    name: 'Regnum Golf Country Bodrum',
    city: 'Bodrum',
    region: 'Muğla',
    holes: 18,
    lat: 37.0837118,
    lon: 27.5459013,
    evidence: 'Turkish Golf Federation inventory and Google Places verified course marker',
    placeId: 'ChIJs2cqMCFovhQRvYjBlz5P29k',
  },
  {
    name: 'Istanbul Golf Club - Mustafa V. Koç Course',
    city: 'Beykoz',
    region: 'İstanbul',
    holes: 9,
    lat: 41.1883034,
    lon: 29.2508735,
    evidence: 'Official Istanbul Golf Club facility with the Google Places course marker',
    placeId: 'ChIJs7Tb5Prbn0ARGAZy8Njt1xA',
  },
  {
    name: 'Kemer Golf & Country Club',
    city: 'Göktürk',
    region: 'İstanbul',
    holes: 18,
    lat: 41.19129,
    lon: 28.9003755,
    evidence: 'Turkish Golf Federation inventory and Google Places verified golf marker',
    placeId: 'ChIJk8Oep9eyyhQRKS-DdfSNsEo',
  },
  {
    name: 'Kusadasi International Golf Club',
    city: 'Söke',
    region: 'Aydın',
    holes: 18,
    lat: 37.7574195,
    lon: 27.3420581,
    evidence: 'Turkish Golf Federation inventory and Google Places verified course marker',
    placeId: 'ChIJpffsciOlvhQRG9r2NCUgNZU',
  },
  {
    name: 'TGF Silivri Golf Facility',
    city: 'Silivri',
    region: 'İstanbul',
    holes: 18,
    lat: 41.1856321,
    lon: 28.1547322,
    evidence: 'Turkish Golf Federation official facility and Google Places marker',
    placeId: 'ChIJ666MeRo7tRQRhqgwgudp47Y',
  },
  {
    name: 'Samsun Golf Club',
    city: 'Atakum',
    region: 'Samsun',
    holes: 18,
    lat: 41.3286094,
    lon: 36.3072357,
    evidence: 'Current Samsun Golf Facilities course marker from Google Places',
    placeId: 'ChIJ_Ydkx4R5iEARs0KB2a3UX_M',
  },
  {
    name: 'Vita Park Golf Resort - Halikarnas Course',
    city: 'Milas',
    region: 'Muğla',
    holes: 18,
    lat: 37.1711488,
    lon: 27.5871748,
    evidence: 'Google Places verified course marker',
    placeId: 'ChIJxVMaKhRdvhQRi3Sa199KYE8',
  },
  {
    name: 'Hodja Lakes Golf Course',
    city: 'Sarıçam',
    region: 'Adana',
    holes: 18,
    lat: 36.9968333,
    lon: 35.3945563,
    evidence: 'Google Places verified course marker',
    placeId: 'ChIJ1YZledORKBURG7LLBCiD-NQ',
  },
];

export function validateReviewedTrCourseReconciliation(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const course of REVIEWED_TR_COURSE_UPDATES) {
    if (ids.has(course.id)) errors.push(`duplicate update id: ${course.id}`);
    ids.add(course.id);
    if (!course.expectedNames.includes(course.name)) {
      errors.push(`final name not accepted for id=${course.id}`);
    }
    validateCourse(course, names, errors);
  }

  for (const course of REVIEWED_TR_COURSE_ADDITIONS) {
    if (!course.placeId.trim()) errors.push(`missing place id: ${course.name}`);
    validateCourse(course, names, errors);
  }

  if (REVIEWED_TR_COURSE_UPDATES.length !== 10) {
    errors.push('expected exactly ten protected existing-course updates');
  }
  if (REVIEWED_TR_COURSE_ADDITIONS.length !== 18) {
    errors.push('expected exactly eighteen reviewed additions');
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
    course.lat < 35 ||
    course.lat > 43 ||
    course.lon < 25 ||
    course.lon > 46
  ) {
    errors.push(`coordinates outside Turkey review bounds: ${course.name}`);
  }
}
