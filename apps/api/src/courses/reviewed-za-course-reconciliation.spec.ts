import {
  REVIEWED_ZA_COURSE_ADDITIONS,
  REVIEWED_ZA_COURSE_UPDATES,
  validateReviewedZaCourseReconciliation,
} from './reviewed-za-course-reconciliation';

describe('reviewed South Africa course reconciliation', () => {
  const all = [
    ...REVIEWED_ZA_COURSE_UPDATES,
    ...REVIEWED_ZA_COURSE_ADDITIONS,
  ];
  const names = all.map((course) => course.name);

  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_ZA_COURSE_UPDATES).toHaveLength(38);
    expect(REVIEWED_ZA_COURSE_ADDITIONS).toHaveLength(165);
    expect(validateReviewedZaCourseReconciliation()).toEqual([]);
  });

  it('keeps deterministic identities and valid reviewed metadata', () => {
    expect(new Set(names).size).toBe(names.length);
    expect(
      new Set(all.map((course) => course.placeId)).size,
    ).toBe(all.length);
    expect(
      new Set(
        REVIEWED_ZA_COURSE_UPDATES.map((course) => course.courseId),
      ).size,
    ).toBe(REVIEWED_ZA_COURSE_UPDATES.length);

    for (const course of all) {
      expect(course.name.trim()).not.toBe('');
      expect(course.placeId.trim()).not.toBe('');
      expect(course.evidence.trim()).not.toBe('');
      expect(course.lat).toBeGreaterThanOrEqual(-35.5);
      expect(course.lat).toBeLessThanOrEqual(-22);
      expect(course.lon).toBeGreaterThanOrEqual(16);
      expect(course.lon).toBeLessThanOrEqual(33.5);
    }
  });

  it('keeps independently searchable courses at shared resorts separate', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'Fancourt Links',
        'Fancourt Montagu',
        'Fancourt Outeniqua',
        'Randpark Firethorn Golf Course',
        'Randpark Bushwillow Course',
        'St Francis Links',
        'St Francis Bay Golf Club',
        'Serengeti - Masai Mara Signature Course',
      ]),
    );
  });

  it('excludes discovery noise and resort aliases', () => {
    expect(names).not.toEqual(
      expect.arrayContaining([
        'Atlantic Golf Lab',
        'Golf Republik',
        'Royal Golf Meridian ZA',
        'Wild Coast Sun',
      ]),
    );
    expect(names).toContain('Wild Coast Sun Country Club');
  });

  it('does not add temporarily closed candidates', () => {
    const additionNames = REVIEWED_ZA_COURSE_ADDITIONS.map(
      (course) => course.name,
    );
    expect(additionNames).not.toEqual(
      expect.arrayContaining([
        'Nondela Golf Club',
        'Sutherland Golf course',
        'Wellington Golf Club',
        'Xolisa Cambridge Mashie Golf Course',
      ]),
    );
  });
});
