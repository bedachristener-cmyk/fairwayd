import {
  normalizeCourseAdditionDecision,
  parseApprovedCourseAddition,
} from './reviewed-course-addition';

describe('reviewed course additions', () => {
  const approved = {
    country: 'AT',
    name: 'Golf Example',
    city: 'Example',
    region: 'Tirol',
    postalCode: '6000',
    holes: '18',
    website: 'https://example.test/',
    googleLat: '47.25',
    googleLon: '11.4',
    placeId: 'google-place-1',
    reviewDecision: 'APPROVE',
    reviewNotes: 'official outdoor course',
  };

  it('normalizes only supported review decisions', () => {
    expect(normalizeCourseAdditionDecision(' approve ')).toBe('APPROVE');
    expect(normalizeCourseAdditionDecision('keep')).toBe('INVALID');
  });

  it('parses an explicitly approved addition', () => {
    const result = parseApprovedCourseAddition(approved, 'AT');
    expect(result.kind).toBe('approved');
    if (result.kind === 'approved') {
      expect(result.addition).toMatchObject({
        country: 'AT',
        name: 'Golf Example',
        holes: 18,
        lat: 47.25,
        lon: 11.4,
        googlePlaceId: 'google-place-1',
      });
    }
  });

  it('skips every row that is not explicitly approved', () => {
    expect(
      parseApprovedCourseAddition({ ...approved, reviewDecision: 'REVIEW' }, 'AT'),
    ).toEqual({ kind: 'skipped', decision: 'REVIEW' });
  });

  it('rejects unsafe approved additions', () => {
    expect(
      parseApprovedCourseAddition({ ...approved, country: 'DE' }, 'AT'),
    ).toEqual({
      kind: 'invalid',
      reason: 'country mismatch: expected AT, got DE',
    });
    expect(
      parseApprovedCourseAddition({ ...approved, placeId: '' }, 'AT'),
    ).toEqual({ kind: 'invalid', reason: 'missing Google Place ID' });
    expect(
      parseApprovedCourseAddition({ ...approved, holes: '18.5' }, 'AT'),
    ).toEqual({ kind: 'invalid', reason: 'invalid holes value' });
  });
});
