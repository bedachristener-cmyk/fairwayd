import {
  REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2,
  validateReviewedAtMissingCourseAdditionsBatch2,
} from './reviewed-at-missing-course-additions-batch-2';

describe('reviewed Austrian missing-course additions batch 2', () => {
  it('contains ten distinct reviewed outdoor facilities', () => {
    expect(REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2).toHaveLength(10);
    expect(
      new Set(
        REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2.map(
          (course) => course.name,
        ),
      ).size,
    ).toBe(10);
  });

  it('keeps one marker per physical multi-course facility', () => {
    const pischelsdorf = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2.find(
      (course) => course.name === 'Golfclub Pischelsdorf – Gut Kaltenhausen',
    );
    const roemergolf = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2.find(
      (course) => course.name === 'Golfclub Römergolf',
    );

    expect(pischelsdorf).toMatchObject({ holes: 24 });
    expect(roemergolf).toMatchObject({ holes: 27 });
  });

  it('contains complete, plausible metadata and review evidence', () => {
    for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_2) {
      expect(course.name.trim()).toBe(course.name);
      expect(course.city).toBeTruthy();
      expect(course.region).toBeTruthy();
      expect(course.postalCode).toMatch(/^[0-9]{4}$/);
      expect(course.holes).toBeGreaterThan(0);
      expect(new URL(course.website).protocol).toBe('https:');
      expect(new URL(course.evidenceUrl).protocol).toBe('https:');
      expect(course.coordinateSource).toBeTruthy();
      expect(course.lat).toBeGreaterThanOrEqual(-90);
      expect(course.lat).toBeLessThanOrEqual(90);
      expect(course.lon).toBeGreaterThanOrEqual(-180);
      expect(course.lon).toBeLessThanOrEqual(180);
      expect(course.googlePlaceId).toMatch(/^ChIJ/);
    }
    expect(validateReviewedAtMissingCourseAdditionsBatch2()).toEqual([]);
  });
});
