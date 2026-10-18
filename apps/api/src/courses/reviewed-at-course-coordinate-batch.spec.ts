import {
  REVIEWED_AT_COORDINATE_BATCH,
  validateReviewedAtCoordinateBatch,
} from './reviewed-at-course-coordinate-batch';

describe('reviewed Austrian coordinate batch', () => {
  it('contains the 77 high-confidence active facility matches', () => {
    expect(REVIEWED_AT_COORDINATE_BATCH).toHaveLength(77);
    expect(
      REVIEWED_AT_COORDINATE_BATCH.map((item) => item.name),
    ).toEqual(
      expect.arrayContaining([
        'Diamond Country Club',
        'Golf Club Arlberg',
        'Golfclub Kitzbühel-Schwarzsee',
        'Golfclub Nationalpark Hohe Tauern',
        'Golfpark Klopeinersee',
      ]),
    );
  });

  it('does not contain unresolved or deactivated records', () => {
    const names = new Set(
      REVIEWED_AT_COORDINATE_BATCH.map((item) => item.name),
    );
    for (const excluded of [
      'Golfclub Dornbirn',
      'Golfclub Olympisches Dorf',
      'Golfclub Thayatal',
      'Golfclub Weststmk',
      'Golfclub am Orient',
      'Golf Club Hubbelrath',
      'Golf Club Welten',
      'Golfclub Lungau (Akademie)',
    ]) {
      expect(names.has(excluded)).toBe(false);
    }
  });

  it('contains unique IDs, Google Place IDs, and valid coordinates', () => {
    expect(validateReviewedAtCoordinateBatch()).toEqual([]);
  });
});
