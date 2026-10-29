export type ReviewedCyKnownCourseTarget = {
  name: string;
  expectedHoles: number;
  category: 'course' | 'short-course' | 'restricted-course';
  query: string;
};

export const REVIEWED_CY_KNOWN_COURSE_TARGETS: ReviewedCyKnownCourseTarget[] = [
  {
    name: 'Aphrodite Hills Golf Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Aphrodite Hills Golf Course PGA National Cyprus',
  },
  {
    name: 'Minthis Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Minthis Golf Club Paphos Cyprus',
  },
  {
    name: 'Eléa Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Elea Golf Club Paphos Cyprus',
  },
  {
    name: 'Columbia Secret Valley Golf Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Columbia Secret Valley Golf Club Cyprus',
  },
  {
    name: 'Limassol Greens Golf',
    expectedHoles: 18,
    category: 'course',
    query: 'Limassol Greens Golf Cyprus',
  },
  {
    name: 'Vikla Golf & Country Club',
    expectedHoles: 12,
    category: 'course',
    query: 'Vikla Golf and Country Club Cyprus',
  },
  {
    name: 'Marios Golf Park',
    expectedHoles: 9,
    category: 'short-course',
    query: 'Marios Golf Park Paphos Cyprus',
  },
  {
    name: 'Ayios Nikolaos Golf Club',
    expectedHoles: 9,
    category: 'restricted-course',
    query: 'Ayios Nikolaos Golf Club Vrysoulles Cyprus',
  },
  {
    name: 'Joint Services Golf Club Dhekelia',
    expectedHoles: 18,
    category: 'restricted-course',
    query: 'Joint Services Golf Club Dhekelia Cyprus',
  },
  {
    name: 'Joint Services Golf Club Episkopi',
    expectedHoles: 18,
    category: 'restricted-course',
    query: 'Joint Services Golf Club Episkopi Cyprus',
  },
  {
    name: 'Korineum Golf & Beach Resort',
    expectedHoles: 18,
    category: 'course',
    query: 'Korineum Golf and Beach Resort Northern Cyprus',
  },
  {
    name: 'CMC Golf Club',
    expectedHoles: 9,
    category: 'short-course',
    query: 'CMC Golf Club Yesilyurt Lefke Cyprus',
  },
  {
    name: 'International Golf Club Nicosia',
    expectedHoles: 18,
    category: 'restricted-course',
    query: 'International Golf Club Nicosia Airport Cyprus',
  },
];

export function validateReviewedCyKnownCourseTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_CY_KNOWN_COURSE_TARGETS) {
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
