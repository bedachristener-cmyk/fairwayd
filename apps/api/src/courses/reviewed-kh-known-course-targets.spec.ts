import {
  REVIEWED_KH_KNOWN_COURSE_TARGETS,
  validateReviewedKhKnownCourseTargets,
} from './reviewed-kh-known-course-targets';

describe('reviewed Cambodia known-course targets', () => {
  it('covers the consolidated nationwide review', () => {
    expect(REVIEWED_KH_KNOWN_COURSE_TARGETS).toHaveLength(15);
    expect(
      REVIEWED_KH_KNOWN_COURSE_TARGETS.map((target) => target.name),
    ).toEqual(
      expect.arrayContaining([
        'Angkor Golf Resort',
        'Garden City Golf Club',
        'City Golf Cambodia',
        'Dara Sakor Golf Resort – Ocean Course',
      ]),
    );
  });

  it('keeps independently searchable resort courses separate', () => {
    const names = REVIEWED_KH_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );

    expect(names.filter((name) => name.startsWith('Vattanac Golf Resort'))).toHaveLength(3);
    expect(names.filter((name) => name.startsWith('Chhun On PGA National Cambodia'))).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('Dara Sakor Golf Resort'))).toHaveLength(2);
  });

  it('keeps one deterministic request per target', () => {
    const names = REVIEWED_KH_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );
    const queries = REVIEWED_KH_KNOWN_COURSE_TARGETS.map(
      (target) => target.query,
    );

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(queries).size).toBe(queries.length);
    expect(validateReviewedKhKnownCourseTargets()).toEqual([]);
  });
});
