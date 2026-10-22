import {
  REVIEWED_SG_KNOWN_COURSE_TARGETS,
  validateReviewedSgKnownCourseTargets,
} from './reviewed-sg-known-course-targets';

describe('reviewed Singapore known-course targets', () => {
  it('covers the official nationwide course inventory', () => {
    expect(REVIEWED_SG_KNOWN_COURSE_TARGETS).toHaveLength(18);
    expect(
      REVIEWED_SG_KNOWN_COURSE_TARGETS.map((target) => target.name),
    ).toEqual(
      expect.arrayContaining([
        'Changi Golf Club',
        'NSRCC – Changi Golf Course',
        'Orchid Country Club',
        'Seletar Country Club',
        'Warren Golf & Country Club',
      ]),
    );
  });

  it('keeps independently searchable named courses separate', () => {
    expect(
      REVIEWED_SG_KNOWN_COURSE_TARGETS.filter((target) =>
        target.name.startsWith('Laguna National'),
      ),
    ).toHaveLength(2);
    expect(
      REVIEWED_SG_KNOWN_COURSE_TARGETS.filter((target) =>
        target.name.startsWith('Sentosa Golf Club'),
      ),
    ).toHaveLength(2);
    expect(
      REVIEWED_SG_KNOWN_COURSE_TARGETS.filter((target) =>
        target.name.startsWith('Singapore Island Country Club'),
      ),
    ).toHaveLength(3);
    expect(
      REVIEWED_SG_KNOWN_COURSE_TARGETS.filter((target) =>
        target.name.startsWith('Tanah Merah Country Club'),
      ),
    ).toHaveLength(2);
  });

  it('contains unique valid definitions', () => {
    expect(validateReviewedSgKnownCourseTargets()).toEqual([]);
  });
});
