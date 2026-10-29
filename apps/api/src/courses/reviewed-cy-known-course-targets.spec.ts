import {
  REVIEWED_CY_KNOWN_COURSE_TARGETS,
  validateReviewedCyKnownCourseTargets,
} from './reviewed-cy-known-course-targets';

describe('reviewed Cyprus known-course targets', () => {
  it('covers championship, short and restricted-access courses island-wide', () => {
    expect(REVIEWED_CY_KNOWN_COURSE_TARGETS).toHaveLength(13);
    expect(
      REVIEWED_CY_KNOWN_COURSE_TARGETS.map((target) => target.name),
    ).toEqual(
      expect.arrayContaining([
        'Aphrodite Hills Golf Course',
        'Limassol Greens Golf',
        'Vikla Golf & Country Club',
        'Marios Golf Park',
        'Korineum Golf & Beach Resort',
        'CMC Golf Club',
      ]),
    );
  });

  it('keeps real short courses and access-limited military courses explicit', () => {
    const shortCourses = REVIEWED_CY_KNOWN_COURSE_TARGETS.filter(
      (target) => target.category === 'short-course',
    );
    const restrictedCourses = REVIEWED_CY_KNOWN_COURSE_TARGETS.filter(
      (target) => target.category === 'restricted-course',
    );

    expect(shortCourses.map((target) => target.name)).toEqual(
      expect.arrayContaining(['Marios Golf Park', 'CMC Golf Club']),
    );
    expect(restrictedCourses).toHaveLength(4);
  });

  it('keeps one deterministic request per target', () => {
    const names = REVIEWED_CY_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );
    const queries = REVIEWED_CY_KNOWN_COURSE_TARGETS.map(
      (target) => target.query,
    );

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(queries).size).toBe(queries.length);
    expect(validateReviewedCyKnownCourseTargets()).toEqual([]);
  });
});
