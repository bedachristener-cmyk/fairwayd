export type ReviewedTrCourseInventoryTarget = {
  name: string;
  query: string;
  expectedHoles: number;
  category: 'BELEK_COURSE' | 'TURKEY_FACILITY';
};

export const REVIEWED_TR_COURSE_INVENTORY_TARGETS: ReviewedTrCourseInventoryTarget[] = [
  { name: 'Antalya Golf Club - PGA Sultan', query: 'Antalya Golf Club PGA Sultan Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Antalya Golf Club - The Pasha', query: 'Antalya Golf Club The Pasha Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Carya Golf Club', query: 'Carya Golf Club Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Cornelia Faldo Golf Club', query: 'Cornelia Faldo Golf Club Belek Turkey', expectedHoles: 27, category: 'BELEK_COURSE' },
  { name: 'Cullinan Links - Aspendos Course', query: 'Cullinan Links Aspendos Golf Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Cullinan Links - Olympos Course', query: 'Cullinan Links Olympos Golf Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Gloria Golf Club - Old Course', query: 'Gloria Golf Club Old Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Gloria Golf Club - New Course', query: 'Gloria Golf Club New Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Gloria Golf Club - Verde Course', query: 'Gloria Golf Club Verde Course Belek Turkey', expectedHoles: 9, category: 'BELEK_COURSE' },
  { name: 'Kaya Palazzo Golf Club', query: 'Kaya Palazzo Golf Club Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Lykia Links Golf Club', query: 'Lykia Links Golf Club Antalya Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Montgomerie Maxx Royal Golf Club', query: 'Montgomerie Maxx Royal Golf Club Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'National Golf Club', query: 'National Golf Club Belek Turkey', expectedHoles: 27, category: 'BELEK_COURSE' },
  { name: 'Robinson Nobilis Golf Club', query: 'Robinson Nobilis Golf Club Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Sueno Golf Club - Pines Course', query: 'Sueno Pines Golf Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Sueno Golf Club - Dunes Course', query: 'Sueno Dunes Golf Course Belek Turkey', expectedHoles: 18, category: 'BELEK_COURSE' },
  { name: 'Ankara Golf Club - Ahlatlibel', query: 'Ankara Golf Club Ahlatlibel Turkey golf course', expectedHoles: 9, category: 'TURKEY_FACILITY' },
  { name: 'Regnum Golf Country Ankara', query: 'Regnum Golf Country Ankara Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Ataşehir Golf Club', query: 'Atasehir Golf Club Istanbul Turkey golf course', expectedHoles: 6, category: 'TURKEY_FACILITY' },
  { name: 'Bodrum Golf Club', query: 'Bodrum Golf Club Turkey golf course', expectedHoles: 9, category: 'TURKEY_FACILITY' },
  { name: 'Regnum Golf Country Bodrum', query: 'Regnum Golf Country Bodrum Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Istanbul Golf Club', query: 'Istanbul Golf Club Beykoz Turkey golf course', expectedHoles: 9, category: 'TURKEY_FACILITY' },
  { name: 'Kemer Golf & Country Club', query: 'Kemer Golf Country Club Gokturk Istanbul Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Kusadasi International Golf Club', query: 'Kusadasi International Golf Club Soke Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'TGF Silivri Golf Facility', query: 'TGF Silivri Golf Tesisi Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Samsun Golf Club', query: 'Samsun Golf Kulubu Turkey golf course', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Vita Park Golf Resort - Halikarnas Course', query: 'Vita Park Halikarnas Golf Course Bodrum Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Hodja Lakes Golf Course', query: 'Hodja Lakes Golf Course Adana Turkey', expectedHoles: 18, category: 'TURKEY_FACILITY' },
  { name: 'Mustafa V. Koc Golf Course', query: 'Mustafa V Koc Golf Course Beykoz Istanbul Turkey', expectedHoles: 9, category: 'TURKEY_FACILITY' },
];

export function validateReviewedTrCourseInventoryTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_TR_COURSE_INVENTORY_TARGETS) {
    if (!target.name.trim()) errors.push('target name is required');
    if (names.has(target.name)) errors.push(`duplicate target name: ${target.name}`);
    names.add(target.name);

    if (!target.query.toLowerCase().includes('turkey')) {
      errors.push(`query must be country-qualified: ${target.name}`);
    }
    if (queries.has(target.query)) errors.push(`duplicate query: ${target.query}`);
    queries.add(target.query);
    if (!Number.isInteger(target.expectedHoles) || target.expectedHoles <= 0) {
      errors.push(`invalid expected holes: ${target.name}`);
    }
  }

  return errors;
}
