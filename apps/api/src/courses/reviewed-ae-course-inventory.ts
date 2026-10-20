export type ReviewedAeCourseInventoryTarget = {
  name: string;
  query: string;
  expectedHoles: number;
  category: 'ABU_DHABI' | 'DUBAI' | 'NORTHERN_EMIRATES';
};

export const REVIEWED_AE_COURSE_INVENTORY_TARGETS: ReviewedAeCourseInventoryTarget[] = [
  { name: 'Abu Dhabi City Golf Club', query: 'Abu Dhabi City Golf Club United Arab Emirates', expectedHoles: 9, category: 'ABU_DHABI' },
  { name: 'Abu Dhabi Golf Club - National Course', query: 'Abu Dhabi Golf Club National Course United Arab Emirates', expectedHoles: 18, category: 'ABU_DHABI' },
  { name: 'Abu Dhabi Golf Club - Garden Course', query: 'Abu Dhabi Golf Club Garden Course United Arab Emirates', expectedHoles: 9, category: 'ABU_DHABI' },
  { name: 'Al Ain Equestrian, Shooting & Golf Club', query: 'Al Ain Equestrian Shooting Golf Club United Arab Emirates', expectedHoles: 27, category: 'ABU_DHABI' },
  { name: 'Al Dhafra Golf Club', query: 'Al Dhafra Golf Club Al Ruwais Jebel Dhanna United Arab Emirates', expectedHoles: 9, category: 'ABU_DHABI' },
  { name: 'Al Dhannah Golf Club', query: 'Al Dhannah Golf Club United Arab Emirates', expectedHoles: 9, category: 'ABU_DHABI' },
  { name: 'Al Ghazal Golf Club', query: 'Al Ghazal Golf Club Abu Dhabi United Arab Emirates', expectedHoles: 18, category: 'ABU_DHABI' },
  { name: 'Saadiyat Beach Golf Club', query: 'Saadiyat Beach Golf Club United Arab Emirates', expectedHoles: 18, category: 'ABU_DHABI' },
  { name: 'Yas Acres Golf & Country Club', query: 'Yas Acres Golf Country Club United Arab Emirates', expectedHoles: 9, category: 'ABU_DHABI' },
  { name: 'Yas Links Abu Dhabi', query: 'Yas Links Abu Dhabi United Arab Emirates', expectedHoles: 18, category: 'ABU_DHABI' },

  { name: 'Arabian Ranches Golf Club', query: 'Arabian Ranches Golf Club Dubai United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'Dubai Creek Golf & Yacht Club', query: 'Dubai Creek Golf Yacht Club United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'Dubai Hills Golf Club', query: 'Dubai Hills Golf Club United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'Emirates Golf Club - Majlis Course', query: 'Emirates Golf Club Majlis Course United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'Emirates Golf Club - Faldo Course', query: 'Emirates Golf Club Faldo Course United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'JA The Resort Golf Course', query: 'JA The Resort Golf Course Dubai United Arab Emirates', expectedHoles: 9, category: 'DUBAI' },
  { name: 'Jumeirah Golf Estates - Earth Course', query: 'Jumeirah Golf Estates Earth Course United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'Jumeirah Golf Estates - Fire Course', query: 'Jumeirah Golf Estates Fire Course United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'The Els Club Dubai', query: 'The Els Club Dubai United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'The Montgomerie Dubai', query: 'The Montgomerie Golf Club Dubai United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },
  { name: 'The Track, Meydan Golf', query: 'The Track Meydan Golf Dubai United Arab Emirates', expectedHoles: 9, category: 'DUBAI' },
  { name: 'Trump International Golf Club Dubai', query: 'Trump International Golf Club Dubai United Arab Emirates', expectedHoles: 18, category: 'DUBAI' },

  { name: 'Al Hamra Golf Club', query: 'Al Hamra Golf Club Ras Al Khaimah United Arab Emirates', expectedHoles: 18, category: 'NORTHERN_EMIRATES' },
  { name: 'Al Zorah Golf & Yacht Club', query: 'Al Zorah Golf Yacht Club Ajman United Arab Emirates', expectedHoles: 18, category: 'NORTHERN_EMIRATES' },
  { name: 'Sharjah Golf & Shooting Club', query: 'Sharjah Golf Shooting Club United Arab Emirates', expectedHoles: 18, category: 'NORTHERN_EMIRATES' },
  { name: 'Tower Links Golf Club', query: 'Tower Links Golf Club Ras Al Khaimah United Arab Emirates', expectedHoles: 18, category: 'NORTHERN_EMIRATES' },
];

export function validateReviewedAeCourseInventoryTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_AE_COURSE_INVENTORY_TARGETS) {
    if (!target.name.trim()) errors.push('target name is required');
    if (names.has(target.name)) errors.push(`duplicate target name: ${target.name}`);
    names.add(target.name);

    if (!target.query.toLowerCase().includes('united arab emirates')) {
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
