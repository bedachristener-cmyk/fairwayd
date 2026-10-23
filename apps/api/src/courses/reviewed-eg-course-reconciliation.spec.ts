import {
  REVIEWED_EG_COURSE_ADDITIONS,
  REVIEWED_EG_COURSE_DEACTIVATIONS,
  REVIEWED_EG_COURSE_UPDATES,
  validateReviewedEgCourseReconciliation,
} from './reviewed-eg-course-reconciliation';

describe('reviewed Egypt course reconciliation', () => {
  it('contains the single consolidated nationwide review', () => {
    expect(REVIEWED_EG_COURSE_UPDATES).toHaveLength(0);
    expect(REVIEWED_EG_COURSE_ADDITIONS).toHaveLength(26);
    expect(REVIEWED_EG_COURSE_DEACTIVATIONS).toHaveLength(1);
  });

  it('covers Cairo, Mediterranean, Red Sea and Sinai golf regions', () => {
    const names = REVIEWED_EG_COURSE_ADDITIONS.map((course) => course.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'Gezira Sporting Club Golf Course',
        'Alexandria Sporting Club Golf Course',
        'Marassi Golf Course',
        'Somabay Golf',
        'Pickalbatros Golf Club Sharm El Sheikh',
        'Sokhna Golf Club',
      ]),
    );
  });

  it('keeps only independently named resort layouts separate', () => {
    const names = REVIEWED_EG_COURSE_ADDITIONS.map((course) => course.name);

    expect(names.filter((name) => name.startsWith('Dreamland Golf Resort'))).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('Katameya Dunes'))).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('Katameya Heights'))).toHaveLength(1);
    expect(names.filter((name) => name.startsWith('Madinat Makadi'))).toHaveLength(1);
    expect(names.filter((name) => name.startsWith('Somabay'))).toHaveLength(1);
  });

  it('excludes closed projects, aliases and discovery noise', () => {
    const names = REVIEWED_EG_COURSE_ADDITIONS.map((course) => course.name);

    expect(names).not.toContain('Mena House Golf Course');
    expect(names).not.toContain('Orange Lakes Golf Club');
    expect(REVIEWED_EG_COURSE_DEACTIVATIONS).toEqual([
      expect.objectContaining({
        name: 'Orange Lakes Golf Club',
        placeId: 'ChIJwySO6Dn0WBQRJaHyMCZ-Uxc',
      }),
    ]);
    expect(names).not.toContain('Royal Valley Golf Club');
    expect(names).not.toContain('Taba Heights Golf Resort');
    expect(names).not.toContain('Golf Bay Porto El Sokhna');
    expect(names).not.toContain('Bushak Garments');
    expect(names).not.toContain('LXXII Indoor Golf Simulator');
    expect(
      names.some((name) =>
        /indoor|mini golf|hotel|entrance|gate|scoring arena|psychological/i.test(name),
      ),
    ).toBe(false);
  });

  it('uses one marker for multi-layout facilities', () => {
    const byName = new Map(
      REVIEWED_EG_COURSE_ADDITIONS.map((course) => [course.name, course]),
    );

    expect(byName.get('Katameya Heights Golf Club')?.holes).toBe(27);
    expect(byName.get('Madinat Makadi Golf Resort')?.holes).toBe(27);
    expect(byName.get('Mirage City Golf Club')?.holes).toBe(27);
    expect(byName.get('Sokhna Golf Club')?.holes).toBe(27);
    expect(byName.get('Somabay Golf')?.holes).toBe(27);
  });

  it('contains unique valid reviewed metadata', () => {
    expect(validateReviewedEgCourseReconciliation()).toEqual([]);
  });
});
