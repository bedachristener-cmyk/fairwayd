import {
  REVIEWED_TH_BARCELONA_VALLEY_COURSES,
  validateReviewedThBarcelonaValleyCourses,
} from './reviewed-th-barcelona-valley-courses';

describe('reviewed Thailand Barcelona Valley courses', () => {
  it('keeps exactly three independently searchable courses', () => {
    expect(REVIEWED_TH_BARCELONA_VALLEY_COURSES.map((course) => course.name)).toEqual([
      'Barcelona Valley - Valley Course (Rayong Green Valley)',
      'Barcelona Valley - Lake Course (St. Andrews 2000)',
      'Barcelona Valley - Mountain Course (Silky Oak)',
    ]);
  });

  it('contains unique valid reviewed definitions', () => {
    expect(validateReviewedThBarcelonaValleyCourses()).toEqual([]);
  });
});
