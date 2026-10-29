import {
  REVIEWED_TH_COURSE_INVENTORY_TARGETS,
  validateReviewedThCourseInventoryTargets,
} from './reviewed-th-course-inventory';

describe('reviewed Thailand course inventory targets', () => {
  it('contains a substantial one-pass review inventory', () => {
    expect(REVIEWED_TH_COURSE_INVENTORY_TARGETS.length).toBeGreaterThanOrEqual(60);
    expect(validateReviewedThCourseInventoryTargets()).toEqual([]);
  });

  it('keeps one deterministic request per reviewed target', () => {
    expect(new Set(REVIEWED_TH_COURSE_INVENTORY_TARGETS.map((item) => item.name)).size)
      .toBe(REVIEWED_TH_COURSE_INVENTORY_TARGETS.length);
    expect(new Set(REVIEWED_TH_COURSE_INVENTORY_TARGETS.map((item) => item.query)).size)
      .toBe(REVIEWED_TH_COURSE_INVENTORY_TARGETS.length);
  });
});
