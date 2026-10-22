import {
  REVIEWED_KH_COURSE_ADDITIONS,
  REVIEWED_KH_COURSE_DEACTIVATIONS,
  REVIEWED_KH_COURSE_UPDATES,
  validateReviewedKhCourseReconciliation,
} from './reviewed-kh-course-reconciliation';

describe('reviewed Cambodia course reconciliation', () => {
  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_KH_COURSE_UPDATES).toHaveLength(0);
    expect(REVIEWED_KH_COURSE_ADDITIONS).toHaveLength(15);
    expect(REVIEWED_KH_COURSE_DEACTIVATIONS).toHaveLength(0);
  });

  it('keeps independently searchable resort courses separate', () => {
    const names = REVIEWED_KH_COURSE_ADDITIONS.map((course) => course.name);

    expect(names.filter((name) => name.startsWith('Vattanac Golf Resort'))).toHaveLength(3);
    expect(
      names.filter((name) =>
        name.startsWith('Chhun On PGA National Cambodia'),
      ),
    ).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('Dara Sakor Golf Resort'))).toHaveLength(2);
  });

  it('includes outdoor short courses but excludes discovery noise', () => {
    expect(
      REVIEWED_KH_COURSE_ADDITIONS.find(
        (course) => course.name === 'Vattanac Golf Resort – Dragon Turn',
      )?.holes,
    ).toBe(9);
    expect(
      REVIEWED_KH_COURSE_ADDITIONS.find(
        (course) => course.name === 'City Golf Cambodia',
      )?.holes,
    ).toBe(9);
    expect(
      REVIEWED_KH_COURSE_ADDITIONS.some((course) =>
        /indoor|screen|entrance|bag drop|residence|hotel/i.test(course.name),
      ),
    ).toBe(false);
  });

  it('documents the temporary Angkor renovation without deleting the course', () => {
    const angkor = REVIEWED_KH_COURSE_ADDITIONS.find(
      (course) => course.name === 'Angkor Golf Resort',
    );

    expect(angkor?.evidence).toMatch(/temporarily closed/i);
    expect(angkor?.evidence).toMatch(/reopening/i);
  });

  it('contains unique valid reviewed metadata', () => {
    expect(validateReviewedKhCourseReconciliation()).toEqual([]);
  });
});
