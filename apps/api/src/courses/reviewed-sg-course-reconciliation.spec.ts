import {
  REVIEWED_SG_COURSE_ADDITIONS,
  REVIEWED_SG_COURSE_DEACTIVATIONS,
  REVIEWED_SG_COURSE_UPDATES,
  validateReviewedSgCourseReconciliation,
} from './reviewed-sg-course-reconciliation';

describe('reviewed Singapore course reconciliation', () => {
  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_SG_COURSE_UPDATES).toHaveLength(0);
    expect(REVIEWED_SG_COURSE_ADDITIONS).toHaveLength(18);
    expect(REVIEWED_SG_COURSE_DEACTIVATIONS).toHaveLength(0);
  });

  it('keeps independently searchable named courses separate', () => {
    const names = REVIEWED_SG_COURSE_ADDITIONS.map((course) => course.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Laguna National – Classic Course',
        'Laguna National – Masters Course',
        'Sentosa Golf Club – The Serapong',
        'Sentosa Golf Club – The Tanjong',
        'Singapore Island Country Club – Bukit Course',
        'Singapore Island Country Club – Island Course',
        'Singapore Island Country Club – New Course',
        'Tanah Merah Country Club – Garden Course',
        'Tanah Merah Country Club – Tampines Course',
      ]),
    );
  });

  it('keeps multi-loop facilities as one marker', () => {
    const orchid = REVIEWED_SG_COURSE_ADDITIONS.find(
      (course) => course.name === 'Orchid Country Club',
    );
    expect(orchid?.holes).toBe(27);
    expect(
      REVIEWED_SG_COURSE_ADDITIONS.filter((course) =>
        course.name.startsWith('Orchid Country Club'),
      ),
    ).toHaveLength(1);
  });

  it('includes short outdoor courses but excludes indoor discovery noise', () => {
    expect(
      REVIEWED_SG_COURSE_ADDITIONS.find(
        (course) => course.name === 'Changi Golf Club',
      )?.holes,
    ).toBe(9);
    expect(
      REVIEWED_SG_COURSE_ADDITIONS.find(
        (course) => course.name === 'Mandai Executive Golf Course',
      )?.holes,
    ).toBe(9);
    expect(
      REVIEWED_SG_COURSE_ADDITIONS.some((course) =>
        /indoor|simulator|studio/i.test(course.name),
      ),
    ).toBe(false);
  });

  it('contains unique valid reviewed metadata', () => {
    expect(validateReviewedSgCourseReconciliation()).toEqual([]);
  });
});
