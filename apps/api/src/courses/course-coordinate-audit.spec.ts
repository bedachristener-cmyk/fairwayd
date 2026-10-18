import {
  auditCourseCoordinates,
  isValidCoordinate,
} from './course-coordinate-audit';

describe('course coordinate audit', () => {
  it('validates geographic coordinate ranges', () => {
    expect(isValidCoordinate(47.3769, 8.5417)).toBe(true);
    expect(isValidCoordinate(91, 8.5417)).toBe(false);
    expect(isValidCoordinate(47.3769, 181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 8.5417)).toBe(false);
  });

  it('summarizes countries and flags shared coordinates without mutating data', () => {
    const result = auditCourseCoordinates([
      {
        id: 'ch-1',
        country: 'ch',
        lat: 47.1,
        lon: 8.2,
        verified: true,
        source: 'google',
      },
      {
        id: 'de-1',
        country: 'DE',
        lat: 51.2,
        lon: 10.4,
        verified: false,
        source: 'csv',
      },
      {
        id: 'de-2',
        country: 'DE',
        lat: 51.2,
        lon: 10.4,
        verified: false,
        source: 'csv',
      },
      {
        id: 'de-3',
        country: 'DE',
        lat: 0,
        lon: 0,
        verified: false,
        source: '',
      },
    ]);

    expect(result.flagsById.get('de-1')).toEqual({
      validRange: true,
      zeroIsland: false,
      sharedCoordinate: true,
    });
    expect(result.flagsById.get('de-3')?.zeroIsland).toBe(true);
    expect(result.summaries).toEqual([
      {
        country: 'CH',
        active: 1,
        verified: 1,
        unverified: 0,
        invalidRange: 0,
        zeroIsland: 0,
        sharedCoordinateCourses: 0,
        sources: { google: 1 },
      },
      {
        country: 'DE',
        active: 3,
        verified: 0,
        unverified: 3,
        invalidRange: 0,
        zeroIsland: 1,
        sharedCoordinateCourses: 2,
        sources: { csv: 2, '<MISSING>': 1 },
      },
    ]);
  });
});
