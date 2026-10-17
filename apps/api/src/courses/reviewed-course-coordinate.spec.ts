import {
  normalizeCoordinateReviewDecision,
  parseApprovedCoordinateChange,
} from './reviewed-course-coordinate';

describe('reviewed course coordinate decisions', () => {
  it('normalizes supported human review decisions', () => {
    expect(normalizeCoordinateReviewDecision(' approve ')).toBe('APPROVE');
    expect(normalizeCoordinateReviewDecision('keep')).toBe('KEEP');
    expect(normalizeCoordinateReviewDecision('maybe')).toBe('INVALID');
  });

  it('does not treat blank or non-approved rows as updates', () => {
    expect(
      parseApprovedCoordinateChange({ reviewDecision: '' }, 'CH'),
    ).toEqual({ kind: 'skipped', decision: '' });
    expect(
      parseApprovedCoordinateChange({ reviewDecision: 'REVIEW' }, 'CH'),
    ).toEqual({ kind: 'skipped', decision: 'REVIEW' });
  });

  it('parses an explicitly approved coordinate change', () => {
    expect(
      parseApprovedCoordinateChange(
        {
          id: 'course-1',
          country: 'ch',
          name: 'Golf Example',
          currentLat: '47.1',
          currentLon: '8.2',
          googleLat: '47.11',
          googleLon: '8.22',
          reviewDecision: 'APPROVE',
        },
        'CH',
      ),
    ).toEqual({
      kind: 'approved',
      change: {
        id: 'course-1',
        country: 'CH',
        name: 'Golf Example',
        currentLat: 47.1,
        currentLon: 8.2,
        newLat: 47.11,
        newLon: 8.22,
      },
    });
  });

  it('rejects approved rows with a wrong country or invalid coordinates', () => {
    expect(
      parseApprovedCoordinateChange(
        {
          id: 'course-1',
          country: 'DE',
          name: 'Golf Example',
          currentLat: '47.1',
          currentLon: '8.2',
          googleLat: '47.11',
          googleLon: '8.22',
          reviewDecision: 'APPROVE',
        },
        'CH',
      ),
    ).toEqual({
      kind: 'invalid',
      reason: 'country mismatch: expected CH, got DE',
    });

    expect(
      parseApprovedCoordinateChange(
        {
          id: 'course-1',
          country: 'CH',
          name: 'Golf Example',
          currentLat: '47.1',
          currentLon: '8.2',
          googleLat: '999',
          googleLon: '8.22',
          reviewDecision: 'APPROVE',
        },
        'CH',
      ),
    ).toEqual({
      kind: 'invalid',
      reason: 'invalid Google coordinates',
    });
  });
});
