import {
  REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES,
  REVIEWED_AT_UNRESOLVED_INVALID_RECORDS,
  validateReviewedAtUnresolvedCourseReconciliation,
} from './reviewed-at-unresolved-course-reconciliation';

describe('final reviewed Austrian unresolved-course reconciliation', () => {
  it('corrects the real Thayatal-Drosendorf facility', () => {
    expect(REVIEWED_AT_UNRESOLVED_COORDINATE_UPDATES).toEqual([
      expect.objectContaining({
        currentName: 'Golfclub Thayatal',
        targetName: 'Golfclub Thayatal-Drosendorf',
        newLat: 48.8739,
        newLon: 15.598,
      }),
    ]);
  });

  it('soft-deactivates only the two unsupported synthetic records', () => {
    expect(
      REVIEWED_AT_UNRESOLVED_INVALID_RECORDS.map((item) => item.name),
    ).toEqual(['Golfclub Dornbirn', 'Golfclub Weststmk']);
    for (const item of REVIEWED_AT_UNRESOLVED_INVALID_RECORDS) {
      expect(item.reason).toBe(
        'no-current-facility-in-official-regional-inventory',
      );
    }
  });

  it('contains unique IDs, evidence, and valid coordinates', () => {
    expect(validateReviewedAtUnresolvedCourseReconciliation()).toEqual([]);
  });
});
