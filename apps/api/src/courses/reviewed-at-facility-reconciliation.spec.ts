import {
  REVIEWED_AT_FACILITY_ALIASES,
  REVIEWED_AT_INVALID_RECORDS,
  validateReviewedAtFacilityReconciliation,
} from './reviewed-at-facility-reconciliation';

describe('reviewed Austrian facility reconciliation', () => {
  it('keeps one marker per reviewed facility', () => {
    expect(REVIEWED_AT_FACILITY_ALIASES).toHaveLength(14);
    expect(
      REVIEWED_AT_FACILITY_ALIASES.map((item) => item.duplicateName),
    ).toEqual(
      expect.arrayContaining([
        'Golf Club Montafon (Akademie)',
        'Golfclub Herrensee (Compact)',
        'Golfclub Kremstal (Park Kurs)',
        'Golfclub Klopeinersee (Südkurs)',
        'Golfclub Lungau (Akademie)',
        'Golfclub Mieminger Plateau (Park)',
      ]),
    );
  });

  it('separates wrong-country records from facility aliases', () => {
    expect(REVIEWED_AT_INVALID_RECORDS).toEqual([
      expect.objectContaining({
        name: 'Golf Club Hubbelrath',
        reason: 'wrong-country-record',
      }),
      expect.objectContaining({
        name: 'Golf Club Welten',
        reason: 'wrong-country-record',
      }),
    ]);
  });

  it('contains no conflicting IDs or invalid coordinates', () => {
    expect(validateReviewedAtFacilityReconciliation()).toEqual([]);
  });
});
