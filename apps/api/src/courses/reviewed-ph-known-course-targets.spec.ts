import {
  REVIEWED_PH_KNOWN_COURSE_TARGETS,
  validateReviewedPhKnownCourseTargets,
} from './reviewed-ph-known-course-targets';

describe('reviewed Philippines known-course targets', () => {
  it('covers official and established facilities missed by grid discovery', () => {
    expect(REVIEWED_PH_KNOWN_COURSE_TARGETS).toHaveLength(24);
    expect(
      REVIEWED_PH_KNOWN_COURSE_TARGETS.filter(
        (item) => item.category === 'NGAP_MEMBER',
      ).length,
    ).toBeGreaterThanOrEqual(15);
    expect(validateReviewedPhKnownCourseTargets()).toEqual([]);
  });

  it('keeps one deterministic request per target', () => {
    expect(
      new Set(REVIEWED_PH_KNOWN_COURSE_TARGETS.map((item) => item.name)).size,
    ).toBe(REVIEWED_PH_KNOWN_COURSE_TARGETS.length);
    expect(
      new Set(REVIEWED_PH_KNOWN_COURSE_TARGETS.map((item) => item.query)).size,
    ).toBe(REVIEWED_PH_KNOWN_COURSE_TARGETS.length);
  });
});
