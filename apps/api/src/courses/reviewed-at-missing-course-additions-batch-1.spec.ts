import {
  REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1,
  validateReviewedAtMissingCourseAdditionsBatch1,
} from './reviewed-at-missing-course-additions-batch-1';

describe('reviewed Austrian missing-course additions batch 1', () => {
  it('contains ten distinct reviewed outdoor facilities', () => {
    expect(REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1).toHaveLength(10);
    expect(
      new Set(
        REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1.map(
          (course) => course.name,
        ),
      ).size,
    ).toBe(10);
  });

  it('keeps Lans separate and Klöch as one multi-course facility', () => {
    const lans = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1.find(
      (course) => course.name === 'Golfclub Innsbruck-Igls – Golfplatz Lans',
    );
    const kloech = REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1.find(
      (course) => course.name === 'Traminergolf Klöch',
    );

    expect(lans).toMatchObject({
      city: 'Lans',
      holes: 9,
      lat: 47.2449,
      lon: 11.4265,
    });
    expect(kloech).toMatchObject({
      city: 'Klöch',
      holes: 27,
      lat: 46.7502256,
      lon: 15.9713093,
    });
  });

  it('contains complete, plausible metadata and review evidence', () => {
    for (const course of REVIEWED_AT_MISSING_COURSE_ADDITIONS_BATCH_1) {
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
      if (course.googlePlaceId) {
        expect(course.googlePlaceId).toMatch(/^ChIJ/);
      }
    }
    expect(validateReviewedAtMissingCourseAdditionsBatch1()).toEqual([]);
  });
});
