export type ReviewedEgKnownCourseTarget = {
  name: string;
  expectedHoles: number;
  category: 'course' | 'short-course';
  query: string;
};

export const REVIEWED_EG_KNOWN_COURSE_TARGETS: ReviewedEgKnownCourseTarget[] = [
  { name: 'Alexandria Sporting Club Golf Course', expectedHoles: 18, category: 'course', query: 'Alexandria Sporting Club Golf Course Egypt' },
  { name: 'The Allegria Golf Club', expectedHoles: 18, category: 'course', query: 'The Allegria Golf Club Cairo Egypt' },
  { name: 'Amarante Golf City', expectedHoles: 18, category: 'course', query: 'Amarante Golf City Egypt' },
  { name: 'Ancient Sands Golf Club', expectedHoles: 18, category: 'course', query: 'Ancient Sands Golf Club El Gouna Egypt' },
  { name: 'Dreamland Golf Resort – Championship Course', expectedHoles: 18, category: 'course', query: 'Dreamland Golf Resort Championship Course Cairo Egypt' },
  { name: 'El Gouna Golf Club', expectedHoles: 18, category: 'course', query: 'El Gouna Golf Club Egypt' },
  { name: 'Gezira Sporting Club Golf Course', expectedHoles: 18, category: 'course', query: 'Gezira Sporting Club Golf Course Cairo Egypt' },
  { name: 'Hacienda Bay Golf Club', expectedHoles: 18, category: 'course', query: 'Hacienda Bay Golf Club Egypt' },
  { name: 'Katameya Dunes – Lakes Course', expectedHoles: 18, category: 'course', query: 'Katameya Dunes Lakes Course Cairo Egypt' },
  { name: 'Katameya Dunes – Palms Course', expectedHoles: 18, category: 'course', query: 'Katameya Dunes Palms Course Cairo Egypt' },
  { name: 'Katameya Heights – Championship Course', expectedHoles: 18, category: 'course', query: 'Katameya Heights Championship Course Cairo Egypt' },
  { name: 'Katameya Heights – 9-Hole Course', expectedHoles: 9, category: 'short-course', query: 'Katameya Heights 9 Hole Course Cairo Egypt' },
  { name: 'Madinat Makadi Golf Resort', expectedHoles: 18, category: 'course', query: 'Madinat Makadi Golf Resort Egypt' },
  { name: 'Madinaty Golf Club', expectedHoles: 18, category: 'course', query: 'Madinaty Golf Club Cairo Egypt' },
  { name: 'Marassi Golf Resort', expectedHoles: 18, category: 'course', query: 'Marassi Golf Resort Egypt' },
  { name: 'Mena House Golf Course', expectedHoles: 9, category: 'short-course', query: 'Mena House Golf Course Giza Egypt' },
  { name: 'Mirage City Golf Club', expectedHoles: 18, category: 'course', query: 'Mirage City Golf Club Cairo Egypt' },
  { name: 'NEWGIZA Golf Club', expectedHoles: 18, category: 'course', query: 'NEWGIZA Golf Club Egypt' },
  { name: 'Orange Lakes Golf Club', expectedHoles: 18, category: 'course', query: 'Orange Lakes Golf Club Cairo Egypt' },
  { name: 'Palm Hills Golf Course', expectedHoles: 18, category: 'course', query: 'Palm Hills Golf Course Giza Egypt' },
  { name: 'Pickalbatros Golf Club Sharm El Sheikh', expectedHoles: 18, category: 'course', query: 'Pickalbatros Golf Club Sharm El Sheikh Egypt' },
  { name: 'Pyramid Golf & Country Club', expectedHoles: 18, category: 'course', query: 'Pyramid Golf and Country Club Cairo Egypt' },
  { name: 'Porto Marina Golf Club', expectedHoles: 18, category: 'course', query: 'Porto Marina Golf Club Egypt' },
  { name: 'Royal Valley Golf Club', expectedHoles: 18, category: 'course', query: 'Royal Valley Golf Club Luxor Egypt' },
  { name: 'Sokhna Golf Club', expectedHoles: 18, category: 'course', query: 'Sokhna Golf Club Ain Sokhna Egypt' },
  { name: 'Somabay Golf – The Cascades', expectedHoles: 18, category: 'course', query: 'Somabay Golf The Cascades Egypt' },
  { name: 'Steigenberger Al Dau Golf Course', expectedHoles: 9, category: 'short-course', query: 'Steigenberger Al Dau Golf Course Hurghada Egypt' },
  { name: 'Stella Di Mare Golf Club', expectedHoles: 18, category: 'course', query: 'Stella Di Mare Golf Club Ain Sokhna Egypt' },
  { name: 'Taba Heights Golf Resort', expectedHoles: 18, category: 'course', query: 'Taba Heights Golf Resort Egypt' },
  { name: 'Uptown Cairo Golf Club', expectedHoles: 18, category: 'course', query: 'Uptown Cairo Golf Club Egypt' },
];

export function validateReviewedEgKnownCourseTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_EG_KNOWN_COURSE_TARGETS) {
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
