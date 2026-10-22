import {
  REVIEWED_PH_COURSE_ADDITIONS,
  REVIEWED_PH_COURSE_UPDATES,
  validateReviewedPhCourseReconciliation,
} from './reviewed-ph-course-reconciliation';

describe('reviewed Philippines course reconciliation', () => {
  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_PH_COURSE_UPDATES).toHaveLength(46);
    expect(REVIEWED_PH_COURSE_ADDITIONS).toHaveLength(82);
    expect(validateReviewedPhCourseReconciliation()).toEqual([]);
  });

  it('keeps deterministic identities and valid reviewed metadata', () => {
    const all = [
      ...REVIEWED_PH_COURSE_UPDATES,
      ...REVIEWED_PH_COURSE_ADDITIONS,
    ];
    expect(new Set(REVIEWED_PH_COURSE_UPDATES.map((item) => item.courseId)).size)
      .toBe(REVIEWED_PH_COURSE_UPDATES.length);
    expect(new Set(all.map((item) => item.placeId)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.name)).size).toBe(all.length);
    expect(all.every((item) => item.lat >= 4.5 && item.lat <= 21.5)).toBe(true);
    expect(all.every((item) => item.lon >= 116 && item.lon <= 127)).toBe(true);
  });

  it('keeps independently searchable courses at shared facilities separate', () => {
    const names = new Set([
      ...REVIEWED_PH_COURSE_UPDATES,
      ...REVIEWED_PH_COURSE_ADDITIONS,
    ].map((item) => item.name));

    for (const name of [
      'Eagle Ridge Golf & Country Club – Aoki Course',
      'Eagle Ridge Golf & Country Club – Andy Dye Course',
      'Eagle Ridge Golf & Country Club – Nick Faldo Course',
      'Eagle Ridge Golf & Country Club – Greg Norman Course',
      'Manila Southwoods – Masters Course',
      'Manila Southwoods – Legends Course',
      'Wack Wack Golf & Country Club – East Course',
      'Wack Wack Golf & Country Club – West Course',
      'The Orchard Golf & Country Club – Palmer Course',
      'The Orchard Golf & Country Club – Player Course',
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('excludes discovery noise, aliases and indoor golf', () => {
    const names = [
      ...REVIEWED_PH_COURSE_UPDATES,
      ...REVIEWED_PH_COURSE_ADDITIONS,
    ].map((item) => item.name.toLowerCase());

    expect(names.some((name) => name.includes('screen golf'))).toBe(false);
    expect(names.some((name) => name.includes('driving range'))).toBe(false);
    expect(names.some((name) => name.includes('parking'))).toBe(false);
    expect(names.some((name) => name.includes('gornz mini mansion'))).toBe(false);
    expect(names.some((name) => name.includes('dona pepita'))).toBe(false);
    expect(names.some((name) => name.includes('apuao grande'))).toBe(false);
  });
});
