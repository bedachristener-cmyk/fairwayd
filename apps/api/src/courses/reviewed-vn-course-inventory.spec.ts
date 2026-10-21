import { isVietnamCourseInventoryCandidate } from './reviewed-vn-course-inventory';

const candidate = (googleName: string) => ({
  recordType: 'GOOGLE',
  status: 'POSSIBLE_MISSING',
  country: 'VN',
  googleName,
  googleBusinessStatus: 'OPERATIONAL',
  placeId: 'place-1',
});

describe('Vietnam course inventory candidates', () => {
  it('keeps every Google discovery candidate for the consolidated review', () => {
    expect(isVietnamCourseInventoryCandidate(candidate('The Bluffs Grand Ho Tram'))).toBe(true);
    expect(isVietnamCourseInventoryCandidate(candidate('BRG Da Nang Golf Resort'))).toBe(true);
    expect(isVietnamCourseInventoryCandidate(candidate('Small local golf course'))).toBe(true);
  });

  it('rejects non-Google, wrong-country and id-less rows', () => {
    expect(
      isVietnamCourseInventoryCandidate({
        ...candidate('Course'),
        recordType: 'DATABASE',
      }),
    ).toBe(false);
    expect(
      isVietnamCourseInventoryCandidate({
        ...candidate('Course'),
        country: 'TH',
      }),
    ).toBe(false);
    expect(
      isVietnamCourseInventoryCandidate({
        ...candidate('Course'),
        placeId: '',
      }),
    ).toBe(false);
  });
});
