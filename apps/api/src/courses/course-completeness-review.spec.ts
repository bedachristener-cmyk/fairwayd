import {
  buildDiscoveryGrid,
  classifyDiscoveredCourse,
  courseDistanceKm,
  nearestCourse,
} from './course-completeness-review';

describe('course completeness review', () => {
  it('classifies exact, nearby, and distant discoveries conservatively', () => {
    expect(classifyDiscoveredCourse(0.75)).toBe('MATCHED');
    expect(classifyDiscoveredCourse(0.751)).toBe('REVIEW_NEARBY');
    expect(classifyDiscoveredCourse(3)).toBe('REVIEW_NEARBY');
    expect(classifyDiscoveredCourse(3.001)).toBe('POSSIBLE_MISSING');
  });

  it('finds the nearest existing course', () => {
    const point = { lat: 47.031, lon: 7.632 };
    const match = nearestCourse(point, [
      { id: 'far', name: 'Far', lat: 46.8, lon: 7.3 },
      { id: 'near', name: 'Golf Emmental', lat: 47.0311, lon: 7.6317 },
    ]);

    expect(match?.course.id).toBe('near');
    expect(match?.distanceKm).toBeLessThan(0.1);
    expect(courseDistanceKm(point, point)).toBeCloseTo(0);
  });

  it('builds a deterministic inclusive grid', () => {
    expect(
      buildDiscoveryGrid(
        { minLat: 46, maxLat: 46.5, minLon: 7, maxLon: 7.5 },
        0.25,
        0.25,
      ),
    ).toHaveLength(9);
  });

  it('rejects non-positive grid steps', () => {
    expect(() =>
      buildDiscoveryGrid(
        { minLat: 46, maxLat: 47, minLon: 7, maxLon: 8 },
        0,
        0.25,
      ),
    ).toThrow('Discovery grid steps must be positive');
  });
});
