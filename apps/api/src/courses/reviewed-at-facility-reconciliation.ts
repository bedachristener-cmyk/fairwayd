export type ReviewedAtFacilityAlias = {
  duplicateId: string;
  duplicateName: string;
  duplicateLat: number;
  duplicateLon: number;
  canonicalId: string;
  canonicalName: string;
  canonicalLat: number;
  canonicalLon: number;
  reason: 'duplicate' | 'facility-variant';
};

export type ReviewedAtInvalidRecord = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  reason: 'wrong-country-record';
};

export const REVIEWED_AT_FACILITY_ALIASES: readonly ReviewedAtFacilityAlias[] = [
  {
    duplicateId: 'cmlsfzu2d00g0bkuwvwosjiir',
    duplicateName: 'Diamond Golf Country Club',
    duplicateLat: 48.2922,
    duplicateLon: 15.9142,
    canonicalId: 'cmlsfzsmv00e1bkuwm1c0hwq3',
    canonicalName: 'Diamond Country Club',
    canonicalLat: 48.2914,
    canonicalLon: 15.9142,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfztz800fwbkuw3ndvsqoi',
    duplicateName: 'Golfclub Bad Waltersdorf',
    duplicateLat: 47.1725,
    duplicateLon: 16.0142,
    canonicalId: 'cmlsfztj600fbbkuwasifk3sa',
    canonicalName: 'Golf Club Bad Waltersdorf',
    canonicalLat: 47.1684,
    canonicalLon: 16.0111,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfzuul00h3bkuw1d6f6yyl',
    duplicateName: 'Golf Club Montafon (Akademie)',
    duplicateLat: 47.0822,
    duplicateLon: 9.9142,
    canonicalId: 'cmlsfzsyu00eibkuw1p74668f',
    canonicalName: 'Golfclub Montafon',
    canonicalLat: 47.0722,
    canonicalLon: 9.9042,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfzul200gpbkuw2yo4fbns',
    duplicateName: 'Golfclub Kremstal (Park Kurs)',
    duplicateLat: 48.1122,
    duplicateLon: 14.1942,
    canonicalId: 'cmlsfztrq00fmbkuw3uu3crig',
    canonicalName: 'Golf Resort Kremstal',
    canonicalLat: 48.1122,
    canonicalLon: 14.1942,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfztse00fnbkuwz4fv6dh6',
    duplicateName: 'Golfclub Attersee',
    duplicateLat: 47.9125,
    duplicateLon: 13.5442,
    canonicalId: 'cmlsfzuh900gkbkuwscj5ctqi',
    canonicalName: 'Golfclub am Attersee',
    canonicalLat: 47.9125,
    canonicalLon: 13.5442,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfzu3v00g2bkuwzlrult4l',
    duplicateName: 'Golfclub Neusiedlersee-Donnerskirchen',
    duplicateLat: 47.8925,
    duplicateLon: 16.6542,
    canonicalId: 'cmlsfztko00fdbkuwic4zxop2',
    canonicalName: 'Golfclub Donnerskirchen',
    canonicalLat: 47.8884,
    canonicalLon: 16.6542,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfzuyj00h9bkuwmra57nfs',
    duplicateName: 'Golfclub Herrensee (Compact)',
    duplicateLat: 48.9425,
    duplicateLon: 15.0442,
    canonicalId: 'cmlsfzucg00gebkuwjkl29v1b',
    canonicalName: 'Golfclub Herrensee',
    canonicalLat: 48.9425,
    canonicalLon: 15.0442,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfzurr00gzbkuw2mb2ck55',
    duplicateName: 'Golfclub Reith',
    duplicateLat: 47.4722,
    duplicateLon: 12.3442,
    canonicalId: 'cmlsfzt3g00epbkuwhovg5i3z',
    canonicalName: 'Golfclub Kitzbühel-Schwarzsee',
    canonicalLat: 47.4442,
    canonicalLon: 12.3684,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfzuqb00gxbkuwybexb1sm',
    duplicateName: 'Golfclub Klopeinersee (Südkurs)',
    duplicateLat: 46.5822,
    duplicateLon: 14.6142,
    canonicalId: 'cmlsfztvl00frbkuwnkyhqv06',
    canonicalName: 'Golfpark Klopeinersee',
    canonicalLat: 46.5822,
    canonicalLon: 14.6142,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfzur200gybkuwcjecarzu',
    duplicateName: 'Golfclub Lungau (Akademie)',
    duplicateLat: 47.0922,
    duplicateLon: 13.6342,
    canonicalId: 'cmlsfzuab00gbbkuw36nohfpc',
    canonicalName: 'Golfclub Lungau',
    canonicalLat: 47.0922,
    canonicalLon: 13.6342,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfzusg00h0bkuwgqx4tp7j',
    duplicateName: 'Golfclub Mieminger Plateau (Park)',
    duplicateLat: 47.3025,
    duplicateLon: 10.9842,
    canonicalId: 'cmlsfzt4u00erbkuw4cjef0oi',
    canonicalName: 'Golfpark Mieminger Plateau',
    canonicalLat: 47.2984,
    canonicalLon: 10.9842,
    reason: 'facility-variant',
  },
  {
    duplicateId: 'cmlsfztco00f2bkuw4k3c96wj',
    duplicateName: 'Golfclub Mittersill-Stuhlfelden',
    duplicateLat: 47.2714,
    duplicateLon: 12.5111,
    canonicalId: 'cmlsfzufh00gibkuw5k9vms27',
    canonicalName: 'Golfclub Nationalpark Hohe Tauern',
    canonicalLat: 47.2825,
    canonicalLon: 12.5142,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfzt1b00embkuwtrh7csg1',
    duplicateName: 'Golfclub Mondsee',
    duplicateLat: 47.8414,
    duplicateLon: 13.3542,
    canonicalId: 'cmlsfztdh00f3bkuwg5tesjpr',
    canonicalName: 'Golfclub am Mondsee',
    canonicalLat: 47.8542,
    canonicalLon: 13.3312,
    reason: 'duplicate',
  },
  {
    duplicateId: 'cmlsfzubq00gdbkuwclnjfbgp',
    duplicateName: 'Golfclub Waldviertel',
    duplicateLat: 48.9922,
    duplicateLon: 15.0642,
    canonicalId: 'cmlsfzswo00efbkuwmj90by10',
    canonicalName: 'Golfresort Haugschlag',
    canonicalLat: 48.9914,
    canonicalLon: 15.0542,
    reason: 'facility-variant',
  },
];

export const REVIEWED_AT_INVALID_RECORDS: readonly ReviewedAtInvalidRecord[] = [
  {
    id: 'cmlsfzt6600etbkuw2ycna7ov',
    name: 'Golf Club Hubbelrath',
    lat: 47.2514,
    lon: 11.4142,
    reason: 'wrong-country-record',
  },
  {
    id: 'cmlsfzumg00grbkuwglj6cbk7',
    name: 'Golf Club Welten',
    lat: 48.1425,
    lon: 16.9242,
    reason: 'wrong-country-record',
  },
];

export function validateReviewedAtFacilityReconciliation(): string[] {
  const errors: string[] = [];
  const deactivationIds = new Set<string>();
  const canonicalIds = new Set<string>();

  for (const item of REVIEWED_AT_FACILITY_ALIASES) {
    if (!item.duplicateId || !item.canonicalId) {
      errors.push('facility alias IDs are required');
    }
    if (item.duplicateId === item.canonicalId) {
      errors.push(`duplicate and canonical IDs match: ${item.duplicateName}`);
    }
    if (item.duplicateName === item.canonicalName) {
      errors.push(`duplicate and canonical names match: ${item.duplicateName}`);
    }
    if (deactivationIds.has(item.duplicateId)) {
      errors.push(`duplicate deactivation ID: ${item.duplicateId}`);
    }
    deactivationIds.add(item.duplicateId);
    canonicalIds.add(item.canonicalId);

    for (const [label, lat, lon] of [
      [item.duplicateName, item.duplicateLat, item.duplicateLon],
      [item.canonicalName, item.canonicalLat, item.canonicalLon],
    ] as const) {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        errors.push(`coordinates out of range: ${label}`);
      }
    }
  }

  for (const item of REVIEWED_AT_INVALID_RECORDS) {
    if (!item.id || !item.name) errors.push('invalid record ID and name are required');
    if (deactivationIds.has(item.id)) {
      errors.push(`duplicate deactivation ID: ${item.id}`);
    }
    deactivationIds.add(item.id);
    if (
      item.lat < -90 ||
      item.lat > 90 ||
      item.lon < -180 ||
      item.lon > 180
    ) {
      errors.push(`coordinates out of range: ${item.name}`);
    }
  }

  for (const id of deactivationIds) {
    if (canonicalIds.has(id)) {
      errors.push(`canonical record is also scheduled for deactivation: ${id}`);
    }
  }

  return errors;
}
