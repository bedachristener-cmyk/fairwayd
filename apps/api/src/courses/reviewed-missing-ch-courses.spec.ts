import {
  REVIEWED_MISSING_CH_COURSES,
  validateReviewedMissingChCourses,
} from './reviewed-missing-ch-courses';

describe('reviewed missing CH courses', () => {
  it('contains the 17 reviewed outdoor courses exactly once', () => {
    expect(REVIEWED_MISSING_CH_COURSES).toHaveLength(17);
    expect(
      new Set(REVIEWED_MISSING_CH_COURSES.map((course) => course.name)).size,
    ).toBe(17);
  });

  it('contains complete, plausible course metadata', () => {
    for (const course of REVIEWED_MISSING_CH_COURSES) {
      expect(course.name.trim()).toBe(course.name);
      expect(course.city).toBeTruthy();
      expect(course.region).toMatch(/^[A-Z]{2}$/);
      expect(course.postalCode).toMatch(/^[0-9]{4}$/);
      expect([9, 18]).toContain(course.holes);
      expect(new URL(course.website).protocol).toBe('https:');
      expect(course.lat).toBeGreaterThanOrEqual(-90);
      expect(course.lat).toBeLessThanOrEqual(90);
      expect(course.lon).toBeGreaterThanOrEqual(-180);
      expect(course.lon).toBeLessThanOrEqual(180);
      expect(course.googlePlaceId).toMatch(/^ChIJ/);
    }
    expect(validateReviewedMissingChCourses()).toEqual([]);
  });
});
