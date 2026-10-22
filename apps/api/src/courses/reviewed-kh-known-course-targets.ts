export type ReviewedKhKnownCourseTarget = {
  name: string;
  expectedHoles: number;
  category: 'course' | 'short-course';
  query: string;
};

export const REVIEWED_KH_KNOWN_COURSE_TARGETS: ReviewedKhKnownCourseTarget[] = [
  {
    name: 'Angkor Golf Resort',
    expectedHoles: 18,
    category: 'course',
    query: 'Angkor Golf Resort Siem Reap Cambodia',
  },
  {
    name: 'Phokeethra Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Phokeethra Country Club Siem Reap Cambodia',
  },
  {
    name: 'Siem Reap Booyoung Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Siem Reap Booyoung Country Club Cambodia',
  },
  {
    name: 'Cambodia Golf & Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Cambodia Golf and Country Club Phnom Penh',
  },
  {
    name: 'Royal Cambodia Phnom Penh Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Royal Cambodia Phnom Penh Golf Club',
  },
  {
    name: 'Grand Phnom Penh Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Grand Phnom Penh Golf Club Cambodia',
  },
  {
    name: 'Garden City Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Garden City Golf Club Phnom Penh Cambodia',
  },
  {
    name: 'Vattanac Golf Resort – East Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Vattanac Golf Resort East Course Cambodia',
  },
  {
    name: 'Vattanac Golf Resort – West Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Vattanac Golf Resort West Course Cambodia',
  },
  {
    name: 'Vattanac Golf Resort – Dragon Turn',
    expectedHoles: 9,
    category: 'short-course',
    query: 'Vattanac Golf Resort Dragon Turn Night Course Cambodia',
  },
  {
    name: 'Chhun On PGA National Cambodia – Lakes Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Chhun On PGA National Cambodia Lakes Course',
  },
  {
    name: 'Chhun On PGA National Cambodia – Palms Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Chhun On PGA National Cambodia Palms Course',
  },
  {
    name: 'City Golf Cambodia',
    expectedHoles: 9,
    category: 'short-course',
    query: 'City Golf Cambodia Phnom Penh',
  },
  {
    name: 'Dara Sakor Golf Resort – Ocean Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Dara Sakor Golf Resort Ocean Course Cambodia',
  },
  {
    name: 'Dara Sakor Golf Resort – Mountain Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Dara Sakor Golf Resort Mountain Course Cambodia',
  },
];

export function validateReviewedKhKnownCourseTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_KH_KNOWN_COURSE_TARGETS) {
    if (!target.name.trim()) errors.push('target name is empty');
    if (!target.query.trim()) errors.push(`search query is empty: ${target.name}`);
    if (!Number.isInteger(target.expectedHoles) || target.expectedHoles <= 0) {
      errors.push(`invalid holes: ${target.name}`);
    }
    if (names.has(target.name)) errors.push(`duplicate name: ${target.name}`);
    if (queries.has(target.query)) errors.push(`duplicate query: ${target.query}`);
    names.add(target.name);
    queries.add(target.query);
  }

  return errors;
}
