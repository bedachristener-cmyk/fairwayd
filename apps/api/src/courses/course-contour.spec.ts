import {
  buildCourseContourOverpassQuery,
  parseCourseContourFeatures,
  validateCourseContourBounds,
} from './course-contour';

describe('course contour helpers', () => {
  const bounds = {
    minLat: 47.1,
    maxLat: 47.15,
    minLon: 8.1,
    maxLon: 8.18,
  };

  it('accepts a small valid map viewport and rejects unsafe bounds', () => {
    expect(validateCourseContourBounds(bounds)).toEqual([]);
    expect(
      validateCourseContourBounds({
        minLat: 40,
        maxLat: 48,
        minLon: 5,
        maxLon: 12,
      }),
    ).toContain('bounds are too large for the contour endpoint');
    expect(
      validateCourseContourBounds({
        minLat: Number.NaN,
        maxLat: 47,
        minLon: 8,
        maxLon: 9,
      }),
    ).toContain('bounds must contain finite numbers');
  });

  it('builds a bounded query for facilities and playing surfaces', () => {
    const query = buildCourseContourOverpassQuery(bounds);

    expect(query).toContain(
      'way["leisure"="golf_course"](47.1,8.1,47.15,8.18)',
    );
    expect(query).toContain(
      'way["golf"="fairway"](47.1,8.1,47.15,8.18)',
    );
    expect(query).toContain(
      'way["golf"="green"](47.1,8.1,47.15,8.18)',
    );
    expect(query).toContain(
      'way["golf"="tee"](47.1,8.1,47.15,8.18)',
    );
    expect(query).toContain(
      'way["golf"="bunker"](47.1,8.1,47.15,8.18)',
    );
    expect(query).toContain('[timeout:15]');
  });

  it('converts only valid closed polygon ways to longitude-latitude pairs', () => {
    const features = parseCourseContourFeatures({
      elements: [
        {
          type: 'way',
          id: 42,
          tags: { golf: 'fairway', name: 'Hole 1' },
          geometry: [
            { lat: 47.1, lon: 8.1 },
            { lat: 47.11, lon: 8.12 },
            { lat: 47.12, lon: 8.1 },
          ],
        },
        {
          type: 'node',
          id: 43,
          tags: { golf: 'green' },
          geometry: [{ lat: 47.1, lon: 8.1 }],
        },
      ],
    });

    expect(features).toEqual([
      {
        id: 'way/42',
        kind: 'fairway',
        name: 'Hole 1',
        coordinates: [
          [8.1, 47.1],
          [8.12, 47.11],
          [8.1, 47.12],
          [8.1, 47.1],
        ],
      },
    ]);
  });
});
