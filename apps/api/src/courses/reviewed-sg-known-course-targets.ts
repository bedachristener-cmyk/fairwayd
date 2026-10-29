export type ReviewedSgKnownCourseTarget = {
  name: string;
  expectedHoles: number;
  category: 'course' | 'executive-course';
  query: string;
};

export const REVIEWED_SG_KNOWN_COURSE_TARGETS: ReviewedSgKnownCourseTarget[] = [
  {
    name: 'Changi Golf Club',
    expectedHoles: 9,
    category: 'course',
    query: 'Changi Golf Club Singapore',
  },
  {
    name: 'Keppel Club – Sime Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Keppel Club Sime Course Singapore',
  },
  {
    name: 'Laguna National – Classic Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Laguna National Classic Course Singapore',
  },
  {
    name: 'Laguna National – Masters Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Laguna National Masters Course Singapore',
  },
  {
    name: 'Orchid Country Club',
    expectedHoles: 27,
    category: 'course',
    query: 'Orchid Country Club Singapore',
  },
  {
    name: 'NSRCC – Changi Golf Course',
    expectedHoles: 18,
    category: 'course',
    query: 'NSRCC Changi Golf Course Singapore',
  },
  {
    name: 'NSRCC – Kranji Golf Course',
    expectedHoles: 18,
    category: 'course',
    query: 'NSRCC Kranji Golf Course Singapore',
  },
  {
    name: 'Seletar Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Seletar Country Club Singapore',
  },
  {
    name: 'Sembawang Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Sembawang Country Club Golf Course Singapore',
  },
  {
    name: 'Sentosa Golf Club – The Serapong',
    expectedHoles: 18,
    category: 'course',
    query: 'Sentosa Golf Club Serapong Course Singapore',
  },
  {
    name: 'Sentosa Golf Club – The Tanjong',
    expectedHoles: 18,
    category: 'course',
    query: 'Sentosa Golf Club Tanjong Course Singapore',
  },
  {
    name: 'Singapore Island Country Club – Bukit Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Singapore Island Country Club Bukit Course Singapore',
  },
  {
    name: 'Singapore Island Country Club – Island Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Singapore Island Country Club Island Course Singapore',
  },
  {
    name: 'Singapore Island Country Club – New Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Singapore Island Country Club New Course Singapore',
  },
  {
    name: 'Tanah Merah Country Club – Garden Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Tanah Merah Country Club Garden Course Singapore',
  },
  {
    name: 'Tanah Merah Country Club – Tampines Course',
    expectedHoles: 18,
    category: 'course',
    query: 'Tanah Merah Country Club Tampines Course Singapore',
  },
  {
    name: 'Warren Golf & Country Club',
    expectedHoles: 18,
    category: 'course',
    query: 'Warren Golf and Country Club Singapore',
  },
  {
    name: 'Mandai Executive Golf Course',
    expectedHoles: 9,
    category: 'executive-course',
    query: 'Mandai Executive Golf Course Singapore',
  },
];

export function validateReviewedSgKnownCourseTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_SG_KNOWN_COURSE_TARGETS) {
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
