import {
  REVIEWED_CY_COURSE_ADDITIONS,
  REVIEWED_CY_COURSE_DEACTIVATIONS,
  REVIEWED_CY_COURSE_UPDATES,
  validateReviewedCyCourseReconciliation,
} from './reviewed-cy-course-reconciliation';

describe('reviewed Cyprus course reconciliation', () => {
  it('contains the single consolidated island-wide review', () => {
    expect(REVIEWED_CY_COURSE_UPDATES).toHaveLength(0);
    expect(REVIEWED_CY_COURSE_ADDITIONS).toHaveLength(12);
    expect(REVIEWED_CY_COURSE_DEACTIVATIONS).toHaveLength(0);
  });

  it('includes championship, short and restricted-access outdoor courses', () => {
    const byName = new Map(
      REVIEWED_CY_COURSE_ADDITIONS.map((course) => [course.name, course]),
    );

    expect(byName.get('Limassol Greens Golf')?.holes).toBe(18);
    expect(byName.get('Marios Golf Park')?.holes).toBe(9);
    expect(byName.get('CMC Golf Club')?.holes).toBe(9);
    expect(byName.get('Joint Services Golf Club Dhekelia')?.holes).toBe(18);
    expect(byName.get('Joint Services Golf Club Episkopi')?.holes).toBe(18);
    expect(byName.get('Ayios Nikolaos Golf Club')?.holes).toBe(9);
  });

  it('uses reviewed clubhouse markers for military courses', () => {
    const names = [
      'Ayios Nikolaos Golf Club',
      'Joint Services Golf Club Dhekelia',
      'Joint Services Golf Club Episkopi',
    ];

    for (const name of names) {
      const course = REVIEWED_CY_COURSE_ADDITIONS.find(
        (candidate) => candidate.name === name,
      );
      expect(course?.placeId).toMatch(/^manual:cy-/);
      expect(course?.evidence).toMatch(/clubhouse marker/i);
    }
  });

  it('excludes discovery noise and the unsupported former Nicosia airport course', () => {
    const names = REVIEWED_CY_COURSE_ADDITIONS.map((course) => course.name);

    expect(names).not.toContain('International Golf Club Nicosia');
    expect(names).not.toContain('Sklavovouni');
    expect(
      names.some((name) =>
        /indoor|mini golf|academy|lessons|head office|hole 1|hotel/i.test(name),
      ),
    ).toBe(false);
  });

  it('contains unique valid reviewed metadata', () => {
    expect(validateReviewedCyCourseReconciliation()).toEqual([]);
  });
});
