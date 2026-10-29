import {
  REVIEWED_AT_DIRECTORY_EXCLUSIONS,
  REVIEWED_AT_DIRECTORY_MISSING_COURSES,
  validateReviewedAtDirectoryMissingCourses,
} from './reviewed-at-directory-missing-courses';

describe('reviewed Austrian directory missing-course candidates', () => {
  it('contains the 22 independently reviewed missing physical facilities', () => {
    expect(REVIEWED_AT_DIRECTORY_MISSING_COURSES).toHaveLength(22);
    expect(validateReviewedAtDirectoryMissingCourses()).toEqual([]);
  });

  it('keeps distinct nearby facilities separate', () => {
    const names = REVIEWED_AT_DIRECTORY_MISSING_COURSES.map(
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

  it('uses one marker for multiple layouts at the same facility', () => {
    const vienna = REVIEWED_AT_DIRECTORY_MISSING_COURSES.filter((course) =>
      course.name.includes('Golfpark Vienna'),
    );
    expect(vienna).toEqual([
      expect.objectContaining({
        name: 'Golfpark Vienna – GC Wien-Süßenbrunn & Citygolf',
        holes: 27,
      }),
    ]);

    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.find(
        (course) => course.name === 'Golfclub St. Pölten',
      ),
    ).toMatchObject({ holes: 27 });
    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.find(
        (course) => course.name === 'Golfclub Dolomitengolf Osttirol',
      ),
    ).toMatchObject({ holes: 36 });
  });

  it('does not propose the existing Richardshof alias or closed Bad Gleichenberg course', () => {
    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.some(
        (course) => course.name === 'Grazer Golfclub Thalersee',
      ),
    ).toBe(false);
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual({
      name: 'Grazer Golfclub Thalersee',
      reason:
        'already represented by active Golfclub Graz-Thalersee at the same physical facility',
    });
    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.some(
        (course) => course.name === 'Golfpark Klopeinersee-Südkärnten',
      ),
    ).toBe(false);
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual({
      name: 'Golfpark Klopeinersee-Südkärnten',
      reason:
        'already represented by active Golfpark Klopeinersee at the same physical facility',
    });
    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.some(
        (course) => course.name === 'Golfclub Gut Richardhof',
      ),
    ).toBe(false);
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual({
      name: 'Golfclub Gut Richardhof',
      reason:
        'already represented by active Golfclub Richardshof at the same physical facility',
    });
    expect(
      REVIEWED_AT_DIRECTORY_MISSING_COURSES.some(
        (course) => course.name === 'Golfclub Bad Gleichenberg',
      ),
    ).toBe(false);
    expect(REVIEWED_AT_DIRECTORY_EXCLUSIONS).toContainEqual({
      name: 'Golfclub Bad Gleichenberg',
      reason: 'operator ended golf-course operations on 2025-12-31',
    });
  });
});
