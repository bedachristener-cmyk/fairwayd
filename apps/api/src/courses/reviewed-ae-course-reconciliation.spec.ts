import {
  REVIEWED_AE_COURSE_ADDITIONS,
  REVIEWED_AE_COURSE_EXCLUSIONS,
  REVIEWED_AE_COURSE_UPDATES,
  validateReviewedAeCourseReconciliation,
} from './reviewed-ae-course-reconciliation';

describe('reviewed UAE course reconciliation', () => {
  it('contains one consolidated active UAE inventory', () => {
    expect(REVIEWED_AE_COURSE_UPDATES).toHaveLength(9);
    expect(REVIEWED_AE_COURSE_ADDITIONS).toHaveLength(16);
    expect(validateReviewedAeCourseReconciliation()).toEqual([]);
  });

  it('keeps independently searchable championship courses separate', () => {
    const names = [
      ...REVIEWED_AE_COURSE_UPDATES.map((course) => course.name),
      ...REVIEWED_AE_COURSE_ADDITIONS.map((course) => course.name),
    ];

    expect(names).toEqual(
      expect.arrayContaining([
        'Abu Dhabi Golf Club - National Course',
        'Abu Dhabi Golf Club - Garden Course',
        'Emirates Golf Club - Majlis Course',
        'Emirates Golf Club - Faldo Course',
        'Jumeirah Golf Estates - Earth Course',
        'Jumeirah Golf Estates - Fire Course',
      ]),
    );
  });

  it('chooses golf-course candidates over resort and academy aliases', () => {
    const ja = REVIEWED_AE_COURSE_ADDITIONS.find(
      (course) => course.name === 'JA The Resort Golf Course',
    );
    const montgomerie = REVIEWED_AE_COURSE_ADDITIONS.find(
      (course) => course.name === 'The Montgomerie Dubai',
    );

    expect(ja?.placeId).toBe('ChIJ-yI1sf8RXz4RH1TTkNXNtwI');
    expect(montgomerie?.placeId).toBe('ChIJsTbbzpVsXz4RV5iQkOQeDuQ');
  });

  it('excludes the permanently closed historical Al Dhafra course', () => {
    expect(REVIEWED_AE_COURSE_EXCLUSIONS).toEqual([
      expect.objectContaining({
        name: 'Al Dhafra Golf Club',
        businessStatus: 'CLOSED_PERMANENTLY',
      }),
    ]);
    expect(
      REVIEWED_AE_COURSE_ADDITIONS.some(
        (course) => course.name === 'Al Dhafra Golf Club',
      ),
    ).toBe(false);
  });
});
