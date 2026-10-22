import { isPhilippinesCourseInventoryCandidate } from './reviewed-ph-course-inventory';

const candidate = (googleName: string) => ({
  recordType: 'GOOGLE',
  status: 'POSSIBLE_MISSING',
  country: 'PH',
  googleName,
  googleBusinessStatus: 'OPERATIONAL',
  placeId: 'place-1',
});

describe('Philippines course inventory candidates', () => {
  it('keeps every Google discovery candidate for the consolidated review', () => {
    expect(isPhilippinesCourseInventoryCandidate(candidate('Manila Southwoods Golf & Country Club'))).toBe(true);
    expect(isPhilippinesCourseInventoryCandidate(candidate('Baguio Country Club'))).toBe(true);
    expect(isPhilippinesCourseInventoryCandidate(candidate('Small local golf course'))).toBe(true);
  });

  it('rejects non-Google, wrong-country and id-less rows', () => {
    expect(
      isPhilippinesCourseInventoryCandidate({
        ...candidate('Course'),
        recordType: 'DATABASE',
      }),
    ).toBe(false);
    expect(
      isPhilippinesCourseInventoryCandidate({
        ...candidate('Course'),
        country: 'VN',
      }),
    ).toBe(false);
    expect(
      isPhilippinesCourseInventoryCandidate({
        ...candidate('Course'),
        placeId: '',
      }),
    ).toBe(false);
  });
});
