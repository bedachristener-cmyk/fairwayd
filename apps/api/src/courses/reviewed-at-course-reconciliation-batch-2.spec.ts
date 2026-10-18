import {
  REVIEWED_AT_COURSE_RECONCILIATION_BATCH_2,
  REVIEWED_AT_INVALID_RECORDS_BATCH_2,
  UNRESOLVED_AT_COURSES_BATCH_2,
  validateReviewedAtCourseReconciliationBatch2,
} from './reviewed-at-course-reconciliation-batch-2';

describe('second reviewed Austrian course reconciliation', () => {
  it('contains the 21 reviewed coordinate and name corrections', () => {
    expect(REVIEWED_AT_COURSE_RECONCILIATION_BATCH_2).toHaveLength(21);
    expect(
      REVIEWED_AT_COURSE_RECONCILIATION_BATCH_2.map(
        (item) => item.targetName,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Golfclub Schladming-Dachstein',
        'Golfclub Mostviertel Amstetten-Ferschnitz',
        'Golfclub Innsbruck-Igls',
        'Olympia Golf Igls',
        'Golfclub Haugschlag-Waldviertel',
      ]),
    );
  });

  it('keeps the two Innsbruck-Igls physical sites as separate markers', () => {
    const targets = REVIEWED_AT_COURSE_RECONCILIATION_BATCH_2.filter(
      (item) =>
        item.targetName === 'Golfclub Innsbruck-Igls' ||
        item.targetName === 'Olympia Golf Igls',
    );
    expect(targets).toHaveLength(2);
    expect(new Set(targets.map((item) => item.placeId)).size).toBe(2);
  });

  it('keeps unresolved records out of updates and deactivations', () => {
    const reviewedNames = new Set([
      ...REVIEWED_AT_COURSE_RECONCILIATION_BATCH_2.map(
        (item) => item.currentName,
      ),
      ...REVIEWED_AT_INVALID_RECORDS_BATCH_2.map((item) => item.name),
    ]);

    expect(UNRESOLVED_AT_COURSES_BATCH_2).toEqual([
      'Golfclub Dornbirn',
      'Golfclub Thayatal',
      'Golfclub Weststmk',
    ]);
    for (const name of UNRESOLVED_AT_COURSES_BATCH_2) {
      expect(reviewedNames.has(name)).toBe(false);
    }
  });

  it('contains only the separately reviewed invalid Orient record', () => {
    expect(REVIEWED_AT_INVALID_RECORDS_BATCH_2).toEqual([
      expect.objectContaining({
        name: 'Golfclub am Orient',
        reason: 'unverified-nonexistent-facility',
      }),
    ]);
  });

  it('contains unique identifiers and valid coordinates', () => {
    expect(validateReviewedAtCourseReconciliationBatch2()).toEqual([]);
  });
});
