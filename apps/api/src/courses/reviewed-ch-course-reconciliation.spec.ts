import {
  REVIEWED_CH_DUPLICATES,
  REVIEWED_CH_RENAMES,
  validateReviewedChReconciliation,
} from './reviewed-ch-course-reconciliation';

describe('reviewed CH course reconciliation', () => {
  it('contains the three reviewed duplicates and two reviewed renames', () => {
    expect(REVIEWED_CH_DUPLICATES).toHaveLength(3);
    expect(REVIEWED_CH_RENAMES).toHaveLength(2);
  });

  it('contains a valid, non-overlapping definition', () => {
    expect(validateReviewedChReconciliation()).toEqual([]);

    const duplicateNames = REVIEWED_CH_DUPLICATES.flatMap((item) => [
      item.duplicateName,
      item.canonicalName,
    ]);
    expect(new Set(duplicateNames).size).toBe(duplicateNames.length);

    const renameNames = REVIEWED_CH_RENAMES.flatMap((item) => [
      item.currentName,
      item.newName,
    ]);
    expect(new Set(renameNames).size).toBe(renameNames.length);
  });
});
