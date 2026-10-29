import {
  REVIEWED_TR_COURSE_ADDITIONS,
  REVIEWED_TR_COURSE_UPDATES,
  validateReviewedTrCourseReconciliation,
} from './reviewed-tr-course-reconciliation';

describe('reviewed Turkey course reconciliation', () => {
  it('contains the single consolidated Turkey review', () => {
    expect(REVIEWED_TR_COURSE_UPDATES).toHaveLength(10);
    expect(REVIEWED_TR_COURSE_ADDITIONS).toHaveLength(18);
    expect(validateReviewedTrCourseReconciliation()).toEqual([]);
  });

  it('preserves all existing records by id', () => {
    expect(new Set(REVIEWED_TR_COURSE_UPDATES.map((item) => item.id)).size).toBe(
      REVIEWED_TR_COURSE_UPDATES.length,
    );
  });

  it('keeps independently searchable Belek courses separate', () => {
    const finalNames = [
      ...REVIEWED_TR_COURSE_UPDATES.map((item) => item.name),
      ...REVIEWED_TR_COURSE_ADDITIONS.map((item) => item.name),
    ];

    expect(finalNames).toEqual(
      expect.arrayContaining([
        'Cullinan Links - Aspendos Course',
        'Cullinan Links - Olympos Course',
        'Gloria Golf Club - Old Course',
        'Gloria Golf Club - New Course',
        'Gloria Golf Club - Verde Course',
        'Sueno Golf Club - Pines Course',
        'Sueno Golf Club - Dunes Course',
      ]),
    );
  });

  it('does not create separate club and course aliases at one site', () => {
    const additions = REVIEWED_TR_COURSE_ADDITIONS.map((item) => item.name);
    expect(additions).not.toContain('Istanbul Golf Club');
    expect(additions).not.toContain('Mustafa V. Koç Golf Course');
    expect(additions).toContain('Istanbul Golf Club - Mustafa V. Koç Course');
  });
});
