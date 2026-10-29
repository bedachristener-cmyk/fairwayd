export type ReviewedSgCourseDefinition = {
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

export type ReviewedSgCourseDeactivation = {
  name: string;
  placeId: string;
  reason: string;
};

const EVIDENCE =
  'Google Places targeted review cross-checked against official Singapore golf club inventory';

export const REVIEWED_SG_COURSE_UPDATES: ReviewedSgCourseDefinition[] = [];

export const REVIEWED_SG_COURSE_ADDITIONS: ReviewedSgCourseDefinition[] = [
  {
    name: 'Changi Golf Club',
    city: 'Singapore',
    region: 'Singapore',
    holes: 9,
    lat: 1.3920384,
    lon: 103.9848589,
    website: 'https://www.changigolfclub.org.sg/',
    phone: '+65 6545 5133',
    placeId: 'ChIJt-oSDhc82jERSpAH46_9g4Q',
    evidence: EVIDENCE,
  },
  {
    name: 'Keppel Club – Sime Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3416815,
    lon: 103.8110618,
    website: 'https://www.keppelclub.com.sg/',
    phone: '+65 6375 5567',
    placeId: 'ChIJ2QdCQegb2jERpeuye8JoFDw',
    evidence: EVIDENCE,
  },
  {
    name: 'Laguna National – Classic Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3239211,
    lon: 103.9633106,
    website: 'https://www.lagunanational.com/golf',
    phone: '+65 6542 6888',
    placeId: 'manual:sg-laguna-national-classic',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Laguna National – Masters Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3239211,
    lon: 103.9633106,
    website: 'https://www.lagunanational.com/golf',
    phone: '+65 6542 6888',
    placeId: 'manual:sg-laguna-national-masters',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Orchid Country Club',
    city: 'Singapore',
    region: 'Singapore',
    holes: 27,
    lat: 1.411778,
    lon: 103.8443315,
    website: 'https://www.orchidclub.com/golf/courses',
    phone: '+65 6755 9811',
    placeId: 'ChIJAXBY2D0U2jERt1mVvb3Jr_I',
    evidence: EVIDENCE,
  },
  {
    name: 'NSRCC – Changi Golf Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3185099,
    lon: 103.974553,
    website: 'https://www.nsrcc.com.sg/changi-golf-course',
    phone: '+65 6542 8288',
    placeId: 'ChIJe1oNt-Mj2jER7tKZyyQFd-s',
    evidence: EVIDENCE,
  },
  {
    name: 'NSRCC – Kranji Golf Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.4236703,
    lon: 103.7277479,
    website: 'https://www.nsrcc.com.sg/golf/kranji',
    phone: '+65 6795 2300',
    placeId: 'ChIJe-QCpXUS2jERamS_8P5RfXE',
    evidence: EVIDENCE,
  },
  {
    name: 'Seletar Country Club',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.4096707,
    lon: 103.8581161,
    website: 'https://www.seletarclub.com.sg/golf-course/',
    phone: '+65 6486 0800',
    placeId: 'ChIJtXXHuC8U2jERc3E8hMl67AQ',
    evidence: EVIDENCE,
  },
  {
    name: 'Sembawang Country Club',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.4172148,
    lon: 103.8155584,
    website: 'https://sembawanggolf.org.sg/web/',
    phone: '+65 6751 0320',
    placeId: 'ChIJE2JYEvQT2jERWjxQ8t7lN98',
    evidence: EVIDENCE,
  },
  {
    name: 'Sentosa Golf Club – The Serapong',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.2502528,
    lon: 103.8275375,
    website: 'https://sentosagolf.com/the-serapong/',
    phone: '+65 6275 0022',
    placeId: 'ChIJOW92VE0Z2jERflpqFS6E06Q',
    evidence: EVIDENCE,
  },
  {
    name: 'Sentosa Golf Club – The Tanjong',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.24383,
    lon: 103.8292465,
    website: 'https://sentosagolf.com/the-tanjong/',
    phone: '+65 6275 0022',
    placeId: 'ChIJs3x9IrAe2jERgNiFOGlVRA8',
    evidence: EVIDENCE,
  },
  {
    name: 'Singapore Island Country Club – Bukit Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3413867,
    lon: 103.8105068,
    website: 'https://www.sicc.org.sg/',
    phone: '+65 6466 2244',
    placeId: 'ChIJNecNarcQ2jERdw5GN_6OhK4',
    evidence: EVIDENCE,
  },
  {
    name: 'Singapore Island Country Club – Island Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3589462,
    lon: 103.8189859,
    website: 'https://www.sicc.org.sg/course-information/',
    phone: '+65 6459 2222',
    placeId: 'ChIJNepkm9QQ2jER1UIwCnWc_8A',
    evidence: EVIDENCE,
  },
  {
    name: 'Singapore Island Country Club – New Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3617983,
    lon: 103.8151457,
    website: 'https://www.sicc.org.sg/course-information/',
    phone: '+65 6459 2222',
    placeId: 'ChIJ_3tgQgAR2jEREEdifPMuvFU',
    evidence: EVIDENCE,
  },
  {
    name: 'Tanah Merah Country Club – Garden Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3293431,
    lon: 103.9793802,
    website: 'https://www.tmcc.org.sg/golf/garden-course/',
    phone: '+65 6542 3040',
    placeId: 'ChIJE9qXf8w82jERMIhONRXzWnE',
    evidence: EVIDENCE,
  },
  {
    name: 'Tanah Merah Country Club – Tampines Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3277131,
    lon: 103.9703966,
    website: 'https://www.tmcc.org.sg/golf/tampines-course/',
    phone: '+65 6542 3040',
    placeId: 'ChIJVVVV5dI82jERwQ5-U1aL7YE',
    evidence: EVIDENCE,
  },
  {
    name: 'Warren Golf & Country Club',
    city: 'Singapore',
    region: 'Singapore',
    holes: 18,
    lat: 1.3840505,
    lon: 103.7365811,
    website: 'https://www.warren.org.sg/',
    phone: '+65 6586 1245',
    placeId: 'ChIJ8bz5EecR2jERK5d1v4t0Lrs',
    evidence: EVIDENCE,
  },
  {
    name: 'Mandai Executive Golf Course',
    city: 'Singapore',
    region: 'Singapore',
    holes: 9,
    lat: 1.4007913,
    lon: 103.8091387,
    website: 'https://www.mandaigolf.com/',
    phone: '+65 6456 6533',
    placeId: 'ChIJCULggTs82jERkOpnys2Ippk',
    evidence: EVIDENCE,
  },
];

export const REVIEWED_SG_COURSE_DEACTIVATIONS: ReviewedSgCourseDeactivation[] = [];

export function validateReviewedSgCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const identities = new Set<string>();
  const ids = new Set<string>();

  for (const definition of [
    ...REVIEWED_SG_COURSE_UPDATES,
    ...REVIEWED_SG_COURSE_ADDITIONS,
  ]) {
    if (!definition.name.trim()) errors.push('course name is empty');
    if (!definition.city.trim()) errors.push(`city is empty: ${definition.name}`);
    if (!definition.region.trim()) errors.push(`region is empty: ${definition.name}`);
    if (!Number.isFinite(definition.lat) || definition.lat < 1.1 || definition.lat > 1.6) {
      errors.push(`invalid latitude: ${definition.name}`);
    }
    if (!Number.isFinite(definition.lon) || definition.lon < 103.5 || definition.lon > 104.2) {
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
