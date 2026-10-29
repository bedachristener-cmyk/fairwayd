export const REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES = [
  {
    id: 'cmlsfzuvz00h5bkuwi3bzplhm',
    currentName: 'Golfclub Thayatal',
    targetName: 'Golfclub Thayatal-Drosendorf',
    currentLat: 48.8625,
    currentLon: 15.6142,
    newLat: 48.8739,
    newLon: 15.598,
    coordinateSource: 'Waldviertel Tourismus verified partner',
    evidenceUrl:
      'https://www.outdooractive.com/de/poi/waldviertel/golfclub-thayatal-drosendorf/3543288/',
  },
] as const;

export const REVIEWED_AT_UNRESOLVED_INVALID_RECORDS = [
  {
    id: 'cmlsfzuv900h4bkuwyzvs2z3h',
    name: 'Golfclub Dornbirn',
    lat: 47.4122,
    lon: 9.7442,
    reason: 'no-current-facility-in-official-regional-inventory',
    evidenceUrl:
      'https://www.vorarlberg.travel/en/golf-courses-in-vorarlberg/',
  },
  {
    id: 'cmlsfzun200gsbkuw5euyljis',
    name: 'Golfclub Weststmk',
    lat: 46.9422,
    lon: 15.3342,
    reason: 'no-current-facility-in-official-regional-inventory',
    evidenceUrl:
      'https://www.steiermark.com/en/Styria/Active-holidays-in-nature/Golf',
  },
] as const;

export function validateReviewedAtUnresolvedCourseReconciliation(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const targetNames = new Set<string>();

  for (const item of REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES) {
    if (
      !item.id ||
      !item.currentName ||
      !item.targetName ||
      !item.coordinateSource ||
      !item.evidenceUrl
    ) {
      errors.push('complete reviewed-coordinate metadata is required');
    }
    if (ids.has(item.id)) errors.push(`duplicate course ID: ${item.id}`);
    if (targetNames.has(item.targetName)) {
      errors.push(`duplicate target name: ${item.targetName}`);
    }
    ids.add(item.id);
    targetNames.add(item.targetName);

    for (const [label, lat, lon] of [
      ['current', item.currentLat, item.currentLon],
      ['new', item.newLat, item.newLon],
    ] as const) {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        errors.push(`${label} coordinates out of range: ${item.currentName}`);
      }
    }
  }

  for (const item of REVIEWED_AT_UNRESOLVED_INVALID_RECORDS) {
    if (!item.id || !item.name || !item.reason || !item.evidenceUrl) {
      errors.push('complete invalid-record metadata is required');
    }
    if (ids.has(item.id)) errors.push(`duplicate course ID: ${item.id}`);
    ids.add(item.id);
    if (
      item.lat < -90 ||
      item.lat > 90 ||
      item.lon < -180 ||
      item.lon > 180
    ) {
      errors.push(`invalid-record coordinates out of range: ${item.name}`);
    }
  }

  return errors;
}
