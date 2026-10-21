import {
  REVIEWED_VN_COURSE_ADDITIONS,
  REVIEWED_VN_COURSE_UPDATES,
  validateReviewedVnCourseReconciliation,
} from './reviewed-vn-course-reconciliation';

describe('reviewed Vietnam course reconciliation', () => {
  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_VN_COURSE_UPDATES).toHaveLength(44);
    expect(REVIEWED_VN_COURSE_ADDITIONS).toHaveLength(39);
    expect(validateReviewedVnCourseReconciliation()).toEqual([]);
  });

  it('keeps deterministic identities and valid reviewed metadata', () => {
    const all = [
      ...REVIEWED_VN_COURSE_UPDATES,
      ...REVIEWED_VN_COURSE_ADDITIONS,
    ];
    expect(new Set(REVIEWED_VN_COURSE_UPDATES.map((item) => item.courseId)).size)
      .toBe(REVIEWED_VN_COURSE_UPDATES.length);
    expect(new Set(all.map((item) => item.placeId)).size).toBe(all.length);
    expect(all.every((item) => item.lat >= 8 && item.lat <= 24)).toBe(true);
    expect(all.every((item) => item.lon >= 102 && item.lon <= 110)).toBe(true);
  });

  it('keeps independently searchable resort courses separate', () => {
    const names = new Set([
      ...REVIEWED_VN_COURSE_UPDATES,
      ...REVIEWED_VN_COURSE_ADDITIONS,
    ].map((item) => item.name));

    expect(names).toEqual(expect.objectContaining({
      has: expect.any(Function),
    }));
    expect(names.has('PGA NovaWorld Phan Thiet – Garden Course')).toBe(true);
    expect(names.has('PGA NovaWorld Phan Thiet – Ocean Course')).toBe(true);
    expect(names.has('Vietnam Golf & Country Club – East Course')).toBe(true);
    expect(names.has('Vietnam Golf & Country Club – West Course')).toBe(true);
  });

  it('excludes discovery noise and projects not yet open', () => {
    const names = [
      ...REVIEWED_VN_COURSE_UPDATES,
      ...REVIEWED_VN_COURSE_ADDITIONS,
    ].map((item) => item.name.toLowerCase());

    expect(names.some((name) => name.includes('indoor'))).toBe(false);
    expect(names.some((name) => name.includes('driving range'))).toBe(false);
    expect(names.some((name) => name.includes('trump international'))).toBe(false);
    expect(names.some((name) => name.includes('nui coc'))).toBe(false);
    expect(names.some((name) => name.includes('vinpearl golf tuyen quang'))).toBe(false);
  });
});
