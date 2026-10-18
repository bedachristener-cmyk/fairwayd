import {
  REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS,
  REVIEWED_AT_DIRECTORY_EXCLUSIONS,
  validateReviewedAtDirectoryCourseReconciliation,
} from './reviewed-at-directory-course-reconciliation';

describe('final Austrian directory course reconciliation', () => {
  it('contains exactly the 22 reviewed missing facilities', () => {
    expect(REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS).toHaveLength(22);
    expect(
      new Set(
        REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.map((course) => course.name),
      ).size,
    ).toBe(22);
    expect(validateReviewedAtDirectoryCourseReconciliation()).toEqual([]);
  });

  it('uses the reviewed golf-place candidates for ambiguous results', () => {
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.find(
        (course) => course.name === 'Golfclub Seefeld-Reith',
      ),
    ).toMatchObject({
      googlePlaceId: 'ChIJj8pPhSYRnUcR08BGc7Jss_E',
      holes: 9,
    });
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.find(
        (course) => course.name === 'Golfclub Rasmushof',
      ),
    ).toMatchObject({
      googlePlaceId: 'ChIJf5_oGwtNdkcRYpARz_bbzbo',
      holes: 9,
    });
  });

  it('keeps distinct nearby facilities separate', () => {
    const names = REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.map(
      (course) => course.name,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'Golfclub Seefeld-Reith',
        'Golfclub Kitzbühel – Kaps',
        'Golfclub Rasmushof',
        'Golfplatz Mühlberghof',
        'Linsberg Golf',
      ]),
    );
  });

  it('uses one marker per physical multi-layout facility', () => {
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.find((course) =>
        course.name.startsWith('Golfpark Vienna'),
      ),
    ).toMatchObject({ holes: 27 });
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.find(
        (course) => course.name === 'Golfclub St. Pölten',
      ),
    ).toMatchObject({ holes: 27 });
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.find(
        (course) => course.name === 'Golfclub Dolomitengolf Osttirol',
      ),
    ).toMatchObject({ holes: 36 });
  });

  it('documents the existing Richardshof alias and closed Bad Gleichenberg facility as excluded', () => {
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual(
      expect.objectContaining({
        name: 'Grazer Golfclub Thalersee',
        reason:
          'already represented by active Golfclub Graz-Thalersee at the same physical facility',
      }),
    );
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual(
      expect.objectContaining({
        name: 'Golfpark Klopeinersee-Südkärnten',
        reason:
          'already represented by active Golfpark Klopeinersee at the same physical facility',
      }),
    );
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual(
      expect.objectContaining({
        name: 'Golfclub Gut Richardhof',
        reason:
          'already represented by active Golfclub Richardshof at the same physical facility',
      }),
    );
    expect(
      REVIEWED_AT_DIRECTORY_COURSE_ADDITIONS.some(
        (course) => course.name === 'Golfclub Bad Gleichenberg',
      ),
    ).toBe(false);
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual(
      expect.objectContaining({
        name: 'Golfclub Bad Gleichenberg',
        reason: 'operator ended golf-course operations on 2025-12-31',
      }),
    );
  });
});
