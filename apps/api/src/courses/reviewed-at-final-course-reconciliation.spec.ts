import {
  REVIEWED_AT_FINAL_COURSE_ADDITIONS,
  REVIEWED_AT_FINAL_EXCLUSIONS,
  validateReviewedAtFinalCourseReconciliation,
} from './reviewed-at-final-course-reconciliation';

describe('final reviewed Austrian course reconciliation', () => {
  it('contains the seven remaining reviewed outdoor facilities', () => {
    expect(REVIEWED_AT_FINAL_COURSE_ADDITIONS).toHaveLength(7);
    expect(
      new Set(REVIEWED_AT_FINAL_COURSE_ADDITIONS.map((course) => course.name))
        .size,
    ).toBe(7);
  });

  it('keeps independently operated nearby courses separate', () => {
    const names = REVIEWED_AT_FINAL_COURSE_ADDITIONS.map(
      (course) => course.name,
    );

    expect(names).toEqual(
      expect.arrayContaining(['Golfclub GolfMaxX', 'Golfclub Tuttendörfl']),
    );
  });

  it('represents the current Waidhofen six-hole compact course, not the closed nine-hole course', () => {
    expect(
      REVIEWED_AT_FINAL_COURSE_ADDITIONS.find((course) =>
        course.name.includes('Waidhofen'),
      ),
    ).toMatchObject({
      name: 'Golfpark & Trainingszentrum Waidhofen/Thaya',
      holes: 6,
      website: 'https://golfklinik.at/',
    });
  });

  it('documents important rejected discovery rows', () => {
    expect(REVIEWED_AT_FINAL_EXCLUSIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ discoveryName: 'Citygolf Vienna' }),
        expect.objectContaining({ discoveryName: 'Golfschule Rif' }),
        expect.objectContaining({
          discoveryName: 'Golfsport Maria Taferl GmbH & Co KEG',
        }),
      ]),
    );
  });

  it('contains complete, plausible metadata and review evidence', () => {
    for (const course of REVIEWED_AT_FINAL_COURSE_ADDITIONS) {
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

    expect(validateReviewedAtFinalCourseReconciliation()).toEqual([]);
  });
});
