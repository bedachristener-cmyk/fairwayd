import {
  REVIEWED_TH_COURSE_ADDITIONS,
  REVIEWED_TH_COURSE_DEACTIVATIONS,
  REVIEWED_TH_COURSE_UPDATES,
  validateReviewedThCourseReconciliation,
} from './reviewed-th-course-reconciliation';

describe('reviewed Thailand course reconciliation', () => {
  it('contains the single consolidated Thailand review', () => {
    expect(REVIEWED_TH_COURSE_UPDATES.length).toBeGreaterThanOrEqual(10);
    expect(REVIEWED_TH_COURSE_DEACTIVATIONS.length).toBeGreaterThanOrEqual(50);
    expect(REVIEWED_TH_COURSE_ADDITIONS.length).toBeGreaterThanOrEqual(50);
  });

  it('keeps one deterministic definition per record and facility', () => {
    expect(validateReviewedThCourseReconciliation()).toEqual([]);
  });

  it('does not add unresolved inventory searches', () => {
    const additions = new Set(REVIEWED_TH_COURSE_ADDITIONS.map((item) => item.name));
    expect(additions.has('Life Privilege Country Club')).toBe(false);
    expect(additions.has('Pi Chai Dap Huk Golf Club')).toBe(false);
    expect(additions.has('Ingkhayut Borihan Camp Golf Course')).toBe(false);
  });

  it('collapses known multi-layout facilities to one marker', () => {
    const names = new Set(REVIEWED_TH_COURSE_DEACTIVATIONS.map((item) => item.expectedName));
    expect(names.has('Blue Canyon Country Club (Lakes)')).toBe(true);
    expect(names.has('St. Andrews 2000 Golf Club')).toBe(true);
    expect(names.has('Silky Oak Country Club')).toBe(true);
    expect(names.has('Royal Thai Army Golf Club (Old)')).toBe(true);
  });
});
