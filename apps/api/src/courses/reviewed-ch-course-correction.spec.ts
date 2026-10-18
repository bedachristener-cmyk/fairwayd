import {
  GOLF_EMMENTAL,
  isExpectedLangenthalDuplicate,
  validateGolfEmmentalDefinition,
} from './reviewed-ch-course-correction';

describe('reviewed CH course corrections', () => {
  it('accepts only the reviewed Langenthal duplicate at its expected coordinates', () => {
    expect(
      isExpectedLangenthalDuplicate({
        country: 'CH',
        name: 'Golf Club Langenthal',
        lat: 47.1313976,
        lon: 7.5053934,
      }),
    ).toBe(true);

    expect(
      isExpectedLangenthalDuplicate({
        country: 'CH',
        name: 'Golf Club Langenthal',
        lat: 47.2197985,
        lon: 7.7747787,
      }),
    ).toBe(false);

    expect(
      isExpectedLangenthalDuplicate({
        country: 'CH',
        name: 'Golf Limpachtal',
        lat: 47.1313976,
        lon: 7.5053934,
      }),
    ).toBe(false);
  });

  it('keeps the manually reviewed Golf Emmental definition valid', () => {
    expect(validateGolfEmmentalDefinition()).toEqual([]);
    expect(GOLF_EMMENTAL).toMatchObject({
      name: 'Golf Emmental',
      country: 'CH',
      region: 'BE',
      city: 'Oberburg',
      holes: 18,
      par: 72,
      verified: true,
      active: true,
    });
    expect(GOLF_EMMENTAL.lat).toBe(47.03101182124836);
    expect(GOLF_EMMENTAL.lon).toBe(7.631722233759894);
  });
});
