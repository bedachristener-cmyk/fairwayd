import {
  REVIEWED_AE_COURSE_INVENTORY_TARGETS,
  validateReviewedAeCourseInventoryTargets,
} from './reviewed-ae-course-inventory';

describe('reviewed UAE course inventory targets', () => {
  it('covers the consolidated nationwide review', () => {
    expect(REVIEWED_AE_COURSE_INVENTORY_TARGETS).toHaveLength(26);
    expect(
      new Set(REVIEWED_AE_COURSE_INVENTORY_TARGETS.map((item) => item.category)),
    ).toEqual(new Set(['ABU_DHABI', 'DUBAI', 'NORTHERN_EMIRATES']));
    expect(validateReviewedAeCourseInventoryTargets()).toEqual([]);
  });

  it('keeps independently searchable championship courses separate', () => {
    const names = new Set(
      REVIEWED_AE_COURSE_INVENTORY_TARGETS.map((item) => item.name),
    );
    expect(names.has('Emirates Golf Club - Majlis Course')).toBe(true);
    expect(names.has('Emirates Golf Club - Faldo Course')).toBe(true);
    expect(names.has('Jumeirah Golf Estates - Earth Course')).toBe(true);
    expect(names.has('Jumeirah Golf Estates - Fire Course')).toBe(true);
  });

  it('keeps one deterministic request per reviewed target', () => {
    expect(
      new Set(REVIEWED_AE_COURSE_INVENTORY_TARGETS.map((item) => item.name)).size,
    ).toBe(REVIEWED_AE_COURSE_INVENTORY_TARGETS.length);
    expect(
      new Set(REVIEWED_AE_COURSE_INVENTORY_TARGETS.map((item) => item.query)).size,
    ).toBe(REVIEWED_AE_COURSE_INVENTORY_TARGETS.length);
  });
});
