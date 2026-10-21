import { isReviewedZaCourseInventoryCandidate } from './reviewed-za-course-inventory';

const candidate = (googleName: string) => ({
  recordType: 'GOOGLE',
  status: 'POSSIBLE_MISSING',
  country: 'ZA',
  googleName,
  googleBusinessStatus: 'OPERATIONAL',
  placeId: 'place-1',
});

describe('reviewed South Africa course inventory filter', () => {
  it('keeps real full-size and short courses', () => {
    expect(isReviewedZaCourseInventoryCandidate(candidate('St Francis Links'))).toBe(true);
    expect(isReviewedZaCourseInventoryCandidate(candidate('Brand Mashie Golf Club'))).toBe(true);
    expect(isReviewedZaCourseInventoryCandidate(candidate('The Hill Par 3 Golf Course'))).toBe(true);
  });

  it.each([
    'Atlantic Golf Lab',
    'Living Under Par golf simulator',
    'Best Golf Carts Dealers – Cape Town (Head Office)',
    'Dis-Chem Constantia Park Pharmacy',
    'The Lodge at Prince\'s Grant',
  ])('rejects discovery noise: %s', (name) => {
    expect(isReviewedZaCourseInventoryCandidate(candidate(name))).toBe(false);
  });

  it('rejects non-Google, wrong-country and id-less rows', () => {
    expect(isReviewedZaCourseInventoryCandidate({ ...candidate('Course'), recordType: 'DATABASE' })).toBe(false);
    expect(isReviewedZaCourseInventoryCandidate({ ...candidate('Course'), country: 'NA' })).toBe(false);
    expect(isReviewedZaCourseInventoryCandidate({ ...candidate('Course'), placeId: '' })).toBe(false);
  });
});
