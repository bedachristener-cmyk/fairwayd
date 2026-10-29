import { isLegacyTripDocumentObjectKey } from './legacy-trip-document-cleanup';

describe('legacy Trip document cleanup key guard', () => {
  it('accepts only the historical Trip document object shape', () => {
    expect(
      isLegacyTripDocumentObjectKey('trips/trip-1/documents/random-file.pdf'),
    ).toBe(true);
    expect(
      isLegacyTripDocumentObjectKey('trips/trip-1/documents/random-file'),
    ).toBe(true);
  });

  it.each([
    'trips/trip-1/cover-123.jpg',
    'trips/trip-1/documents/',
    'trips/trip-1/documents/nested/file.pdf',
    'private-trip-documents/trips/trip-1/documents/file.pdf',
    'posts/file.jpg',
    'avatars/file.jpg',
  ])('rejects non-legacy-document key %s', (key) => {
    expect(isLegacyTripDocumentObjectKey(key)).toBe(false);
  });
});
