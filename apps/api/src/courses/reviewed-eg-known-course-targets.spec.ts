import {
  REVIEWED_EG_KNOWN_COURSE_TARGETS,
  validateReviewedEgKnownCourseTargets,
} from './reviewed-eg-known-course-targets';

describe('reviewed Egypt known-course targets', () => {
  it('covers the consolidated nationwide and resort review', () => {
    expect(REVIEWED_EG_KNOWN_COURSE_TARGETS).toHaveLength(30);
    expect(
      REVIEWED_EG_KNOWN_COURSE_TARGETS.map((target) => target.name),
    ).toEqual(
      expect.arrayContaining([
        'Alexandria Sporting Club Golf Course',
        'Royal Valley Golf Club',
        'Somabay Golf – The Cascades',
        'Pickalbatros Golf Club Sharm El Sheikh',
        'Taba Heights Golf Resort',
      ]),
    );
  });

  it('keeps independently named layouts available for review', () => {
    const names = REVIEWED_EG_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );

    expect(names.filter((name) => name.startsWith('Katameya Dunes'))).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('Katameya Heights'))).toHaveLength(2);
  });

  it('includes uncertain historical courses for explicit review', () => {
    const names = REVIEWED_EG_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );

    expect(names).toEqual(
      expect.arrayContaining([
        'Mena House Golf Course',
        'Royal Valley Golf Club',
        'Taba Heights Golf Resort',
      ]),
    );
  });

  it('keeps one deterministic request per target', () => {
    const names = REVIEWED_EG_KNOWN_COURSE_TARGETS.map(
      (target) => target.name,
    );
    const queries = REVIEWED_EG_KNOWN_COURSE_TARGETS.map(
      (target) => target.query,
    );

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(queries).size).toBe(queries.length);
    expect(validateReviewedEgKnownCourseTargets()).toEqual([]);
  });
});
