export const REVIEWED_CH_DUPLICATES = [
  {
    duplicateName: 'Golf Club Sarganserland',
    canonicalName: 'Golf Club Bad Ragaz',
  },
  {
    duplicateName: 'Golf de la Gruyère',
    canonicalName: 'Golf Club Gruyère',
  },
  {
    duplicateName: 'Golf Küssnacht (Academy)',
    canonicalName: 'Golf Club Küssnacht am Rigi',
  },
] as const;

export const REVIEWED_CH_RENAMES = [
  {
    currentName: 'Golf Club Thierstein',
    newName: 'Golf Club Laufental',
    city: 'Zwingen',
    region: 'BL',
    postalCode: '4222',
    holes: 9,
    website: 'https://www.birs-golf.ch/',
    expectedLat: 47.438628,
    expectedLon: 7.541764999999999,
  },
  {
    currentName: 'Golf Club Weid Ligschwil',
    newName: 'Golf Weid Hauenstein',
    city: 'Hauenstein-Ifenthal',
    region: 'SO',
    postalCode: '4633',
    holes: 9,
    website: 'https://www.golf-hauenstein.ch/',
    expectedLat: 47.3796746,
    expectedLon: 7.871608499999999,
  },
] as const;

export function validateReviewedChReconciliation(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const item of REVIEWED_CH_DUPLICATES) {
    if (item.duplicateName === item.canonicalName) {
      errors.push(`duplicate and canonical names match: ${item.duplicateName}`);
    }
    for (const name of [item.duplicateName, item.canonicalName]) {
      if (!name.trim()) errors.push('course name is required');
    }
  }

  for (const item of REVIEWED_CH_RENAMES) {
    if (item.currentName === item.newName) {
      errors.push(`rename is unchanged: ${item.currentName}`);
    }
    if (names.has(item.currentName) || names.has(item.newName)) {
      errors.push(`rename name is reused: ${item.currentName}`);
    }
    names.add(item.currentName);
    names.add(item.newName);
    if (item.expectedLat < -90 || item.expectedLat > 90) {
      errors.push(`latitude out of range: ${item.newName}`);
    }
    if (item.expectedLon < -180 || item.expectedLon > 180) {
      errors.push(`longitude out of range: ${item.newName}`);
    }
  }

  return errors;
}
