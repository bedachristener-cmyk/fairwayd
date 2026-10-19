import {
  REVIEWED_TR_COURSE_INVENTORY_TARGETS,
  validateReviewedTrCourseInventoryTargets,
} from './reviewed-tr-course-inventory';

describe('reviewed Turkey course inventory targets', () => {
  it('covers the consolidated nationwide and Belek review', () => {
    expect(REVIEWED_TR_COURSE_INVENTORY_TARGETS.length).toBeGreaterThanOrEqual(25);
    expect(
      REVIEWED_TR_COURSE_INVENTORY_TARGETS.filter(
        (item) => item.category === 'BELEK_COURSE',
      ).length,
    ).toBeGreaterThanOrEqual(15);
    expect(validateReviewedTrCourseInventoryTargets()).toEqual([]);
  });

  it('keeps one deterministic request per reviewed target', () => {
    expect(
      new Set(REVIEWED_TR_COURSE_INVENTORY_TARGETS.map((item) => item.name)).size,
    ).toBe(REVIEWED_TR_COURSE_INVENTORY_TARGETS.length);
    expect(
      new Set(REVIEWED_TR_COURSE_INVENTORY_TARGETS.map((item) => item.query)).size,
    ).toBe(REVIEWED_TR_COURSE_INVENTORY_TARGETS.length);
  });
});
