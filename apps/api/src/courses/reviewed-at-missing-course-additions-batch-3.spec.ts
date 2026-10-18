import {
  REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3,
  validateReviewedAtMissingCourseAdditionsBatch3,
} from './reviewed-at-missing-course-additions-batch-3';

describe('reviewed Austrian missing-course additions batch 3', () => {
  it('contains ten distinct reviewed outdoor facilities', () => {
    expect(REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3).toHaveLength(10);
    expect(
      new Set(
        REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3.map(
          (course) => course.name,
        ),
      ).size,
    ).toBe(10);
  });

  it('keeps multi-layout facilities under one physical marker', () => {
    const openGolf = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3.find(
      (course) => course.name === 'Open Golf St. Johann Alpendorf',
    );

    expect(openGolf).toMatchObject({
      holes: 18,
      city: 'St. Johann im Pongau',
    });
  });

  it('contains complete, plausible metadata and review evidence', () => {
    for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_3) {
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
    expect(validateReviewedAtMissingCourseAdditionsBatch3()).toEqual([]);
  });
});
