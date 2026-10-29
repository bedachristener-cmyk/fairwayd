export type ReviewedKhCourseDefinition = {
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

export type ReviewedKhCourseDeactivation = {
  name: string;
  placeId: string;
  reason: string;
};

const EVIDENCE =
  'Google Places targeted review cross-checked against official and current Cambodia golf inventories';

export const REVIEWED_KH_COURSE_UPDATES: ReviewedKhCourseDefinition[] = [];

export const REVIEWED_KH_COURSE_ADDITIONS: ReviewedKhCourseDefinition[] = [
  {
    name: 'Angkor Golf Resort',
    city: 'Siem Reap',
    region: 'Siem Reap',
    holes: 18,
    lat: 13.3677181,
    lon: 103.8165586,
    website: 'https://www.angkor-golf.com/',
    phone: '+855 63 218 288',
    placeId: 'ChIJgzED7MoQEDERIzVrrc-OdTA',
    evidence:
      'Google Places and official Angkor Golf Resort review; temporarily closed for renovation with reopening announced for early November 2026',
  },
  {
    name: 'Phokeethra Country Club',
    city: 'Siem Reap',
    region: 'Siem Reap',
    holes: 18,
    lat: 13.4575352,
    lon: 103.7041347,
    website: 'http://www.phokeethraangkor.com/',
    phone: '+855 63 964 600',
    placeId: 'ChIJ7zStY5QNEDERfGLkH4zD8KE',
    evidence: EVIDENCE,
  },
  {
    name: 'Siem Reap Booyoung Country Club',
    city: 'Siem Reap',
    region: 'Siem Reap',
    holes: 18,
    lat: 13.368744,
    lon: 103.962764,
    website: 'https://www.siemreapbooyoungcc.com/',
    phone: '+855 92 635 765',
    placeId: 'ChIJ4b8NWeI8EDERJUd8jQ1hCsk',
    evidence: EVIDENCE,
  },
  {
    name: 'Cambodia Golf & Country Club',
    city: 'Kampong Speu',
    region: 'Kampong Speu',
    holes: 18,
    lat: 11.4778227,
    lon: 104.6541298,
    placeId: 'ChIJg20gl3k4CTEROr8-U60ODaw',
    evidence: EVIDENCE,
  },
  {
    name: 'Royal Phnom Penh Golf Club',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 18,
    lat: 11.5719901,
    lon: 104.7935999,
    website: 'http://www.grandroyalgolf.com/',
    phone: '+855 68 370 370',
    placeId: 'ChIJ2QtW3PJOCTERR8HTyqqrqs4',
    evidence: EVIDENCE,
  },
  {
    name: 'Grand Phnom Penh Golf Club',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 18,
    lat: 11.6263545,
    lon: 104.8640323,
    website: 'http://www.grandroyalgolf.com/',
    phone: '+855 67 333 919',
    placeId: 'ChIJh24wVGZSCTERNbWsBxxtmVY',
    evidence: EVIDENCE,
  },
  {
    name: 'Garden City Golf Club',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 18,
    lat: 11.6938439,
    lon: 104.8707676,
    website: 'http://www.gardencityclub.com/',
    phone: '+855 88 338 8555',
    placeId: 'ChIJB7URWTitDjERnh3LIuRdGDE',
    evidence: EVIDENCE,
  },
  {
    name: 'Vattanac Golf Resort – East Course',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 18,
    lat: 11.4831332,
    lon: 105.019711,
    website: 'https://www.vattanacgolfresort.com/',
    phone: '+855 23 963 369',
    placeId: 'manual:kh-vattanac-east',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Vattanac Golf Resort – West Course',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 18,
    lat: 11.4831332,
    lon: 105.019711,
    website: 'https://www.vattanacgolfresort.com/',
    phone: '+855 23 963 369',
    placeId: 'manual:kh-vattanac-west',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Vattanac Golf Resort – Dragon Turn',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 9,
    lat: 11.4831332,
    lon: 105.019711,
    website: 'https://www.vattanacgolfresort.com/',
    phone: '+855 23 963 369',
    placeId: 'manual:kh-vattanac-dragon-turn',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Chhun On PGA National Cambodia – Lakes Course',
    city: 'Phnom Penh',
    region: 'Kandal',
    holes: 18,
    lat: 11.703708,
    lon: 104.7920751,
    website: 'https://www.chhunon-golfresort.com/',
    phone: '+855 69 683 888',
    placeId: 'manual:kh-chhun-on-lakes',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Chhun On PGA National Cambodia – Palms Course',
    city: 'Phnom Penh',
    region: 'Kandal',
    holes: 18,
    lat: 11.703708,
    lon: 104.7920751,
    website: 'https://www.chhunon-golfresort.com/',
    phone: '+855 69 683 888',
    placeId: 'manual:kh-chhun-on-palms',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'City Golf Cambodia',
    city: 'Phnom Penh',
    region: 'Phnom Penh',
    holes: 9,
    lat: 11.603802,
    lon: 104.9034692,
    website: 'http://www.citygolfcambodia.com/',
    phone: '+855 88 888 6161',
    placeId: 'ChIJIxzozH9TCTERXlMyNihUu7Q',
    evidence: EVIDENCE,
  },
  {
    name: 'Dara Sakor Golf Resort – Ocean Course',
    city: 'Dara Sakor',
    region: 'Koh Kong',
    holes: 18,
    lat: 10.8788162,
    lon: 103.1449322,
    website: 'http://darasakor.com/',
    phone: '+855 23 626 6666',
    placeId: 'manual:kh-dara-sakor-ocean',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
  {
    name: 'Dara Sakor Golf Resort – Mountain Course',
    city: 'Dara Sakor',
    region: 'Koh Kong',
    holes: 18,
    lat: 10.8788162,
    lon: 103.1449322,
    website: 'http://darasakor.com/',
    phone: '+855 23 626 6666',
    placeId: 'manual:kh-dara-sakor-mountain',
    evidence: EVIDENCE,
    allowSharedLocation: true,
  },
];

export const REVIEWED_KH_COURSE_DEACTIVATIONS: ReviewedKhCourseDeactivation[] = [];

export function validateReviewedKhCourseReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const identities = new Set<string>();
  const ids = new Set<string>();

  for (const definition of [
    ...REVIEWED_KH_COURSE_UPDATES,
    ...REVIEWED_KH_COURSE_ADDITIONS,
  ]) {
    if (!definition.name.trim()) errors.push('course name is empty');
    if (!definition.city.trim()) errors.push(`city is empty: ${definition.name}`);
    if (!definition.region.trim()) errors.push(`region is empty: ${definition.name}`);
    if (!Number.isFinite(definition.lat) || definition.lat < 10.3 || definition.lat > 14.8) {
      errors.push(`invalid latitude: ${definition.name}`);
    }
    if (!Number.isFinite(definition.lon) || definition.lon < 102.2 || definition.lon > 107.7) {
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
