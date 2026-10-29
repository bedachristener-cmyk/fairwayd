export type ReviewedPhKnownCourseTarget = {
  name: string;
  query: string;
  expectedHoles: number | null;
  category: 'NGAP_MEMBER' | 'KNOWN_LOCAL_FACILITY';
};

export const REVIEWED_PH_KNOWN_COURSE_TARGETS: ReviewedPhKnownCourseTarget[] = [
  { name: 'Air Force City Golf Course', query: 'Air Force City Golf Course Clark Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Calatagan Golf Club', query: 'Calatagan Golf Club Batangas Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Haciendas de Naga Golf Club', query: 'Haciendas de Naga Golf Club Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Isabela Golf Club', query: 'Isabela Golf Club Ilagan Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Hallow Ridge Filipinas Golf Club', query: 'Hallow Ridge Filipinas Golf Club Laguna Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Summit Point Golf & Country Club', query: 'Summit Point Golf Country Club Lipa Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Lakewood Golf & Country Club', query: 'Lakewood Golf Country Club Cabanatuan Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'The Country Club', query: 'The Country Club Santa Rosa Laguna golf Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Camp Evangelista Golf Club', query: 'Camp Evangelista Golf Club Cagayan de Oro Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'Dole Kalsangi Golf Club', query: 'Dole Kalsangi Golf Club Polomolok Philippines', expectedHoles: 18, category: 'NGAP_MEMBER' },
  { name: 'Paraiso Golf & Country Club', query: 'Paraiso Golf Country Club Koronadal Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'Sarangani Golf & Country Club', query: 'Sarangani Golf Country Club Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'West Highlands Golf Club', query: 'West Highlands Golf Club Butuan Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'Edwin Andrews Air Base Golf Course', query: 'Edwin Andrews Air Base Golf Course Zamboanga Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'Golf & Country Club of Iligan', query: 'Golf Country Club of Iligan Philippines', expectedHoles: null, category: 'NGAP_MEMBER' },
  { name: 'Club Punta Fuego Golf Course', query: 'Club Punta Fuego Golf Course Nasugbu Philippines', expectedHoles: 9, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Cattle Creek Golf Club', query: 'Cattle Creek Golf Club Bulacan Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Camp Capinpin Golf Course', query: 'Camp Capinpin Golf Course Tanay Philippines', expectedHoles: 9, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Puerto Princesa Golf Club', query: 'Puerto Princesa Golf Club Palawan Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Perfect Star Golf Course', query: 'Perfect Star Golf Course Isabela Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Basa Air Base Golf Club', query: 'Basa Air Base Golf Club Floridablanca Philippines', expectedHoles: 9, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Mayon Golf Course', query: 'Mayon Golf Course Albay Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Dona Pepita Golf Course', query: 'Dona Pepita Golf Course Albay Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
  { name: 'Apuao Grande Island Golf Course', query: 'Apuao Grande Island Golf Course Camarines Norte Philippines', expectedHoles: null, category: 'KNOWN_LOCAL_FACILITY' },
];

export function validateReviewedPhKnownCourseTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_PH_KNOWN_COURSE_TARGETS) {
    if (!target.name.trim()) errors.push('target name is required');
    if (names.has(target.name)) errors.push(`duplicate target name: ${target.name}`);
    names.add(target.name);

    if (!target.query.toLowerCase().includes('philippines')) {
      errors.push(`query must be country-qualified: ${target.name}`);
    }
    if (queries.has(target.query)) errors.push(`duplicate query: ${target.query}`);
    queries.add(target.query);
    if (
      target.expectedHoles !== null &&
      (!Number.isInteger(target.expectedHoles) || target.expectedHoles <= 0)
    ) {
      errors.push(`invalid expected holes: ${target.name}`);
    }
  }

  return errors;
}
