import {
  courseDiscoveryCountryConfig,
  supportedCourseDiscoveryCountries,
} from './course-discovery-country';
import { buildDiscoveryGrid } from './course-completeness-review';

function requestCount(country: string): number {
  const config = courseDiscoveryCountryConfig(country);
  if (!config) return 0;
  return config.areas.reduce(
    (total, area) =>
      total +
      buildDiscoveryGrid(area, config.latStep, config.lonStep).length,
    0,
  );
}

describe('course discovery country configuration', () => {
  it('keeps supported countries explicit and deterministic', () => {
    expect(supportedCourseDiscoveryCountries()).toEqual([
      'AE',
      'AT',
      'CH',
      'TH',
      'TR',
      'VN',
      'ZA',
    ]);
    expect(courseDiscoveryCountryConfig('ae')?.country).toBe('AE');
    expect(courseDiscoveryCountryConfig('at')?.country).toBe('AT');
    expect(courseDiscoveryCountryConfig('th')?.country).toBe('TH');
    expect(courseDiscoveryCountryConfig('tr')?.country).toBe('TR');
    expect(courseDiscoveryCountryConfig('vn')?.country).toBe('VN');
    expect(courseDiscoveryCountryConfig('za')?.country).toBe('ZA');
    expect(courseDiscoveryCountryConfig('DE')).toBeNull();
  });

  it('covers all UAE golf regions with a bounded request plan', () => {
    const config = courseDiscoveryCountryConfig('AE');
    expect(config).not.toBeNull();
    expect(config!.areas).toHaveLength(3);
    expect(config!.searchRadiusMeters).toBe(22_000);
    expect(requestCount('AE')).toBe(119);
  });

  it('preserves the bounded Austrian request plan', () => {
    expect(requestCount('AT')).toBeGreaterThan(200);
    expect(requestCount('AT')).toBeLessThan(300);
  });

  it('uses four bounded Thailand areas instead of a wasteful full rectangle', () => {
    const config = courseDiscoveryCountryConfig('TH');
    expect(config).not.toBeNull();
    expect(config!.areas).toHaveLength(4);
    expect(config!.searchRadiusMeters).toBe(40_000);
    expect(requestCount('TH')).toBe(419);
  });

  it('covers Turkey nationwide with a bounded request plan', () => {
    const config = courseDiscoveryCountryConfig('TR');
    expect(config).not.toBeNull();
    expect(config!.areas).toHaveLength(1);
    expect(config!.searchRadiusMeters).toBe(45_000);
    expect(requestCount('TR')).toBe(390);
  });

  it('covers Vietnam with three bounded regional request plans', () => {
    const config = courseDiscoveryCountryConfig('VN');
    expect(config).not.toBeNull();
    expect(config!.areas).toHaveLength(3);
    expect(config!.searchRadiusMeters).toBe(45_000);
    expect(requestCount('VN')).toBeGreaterThan(250);
    expect(requestCount('VN')).toBeLessThan(300);
  });

  it('covers South Africa nationwide with a bounded request plan', () => {
    const config = courseDiscoveryCountryConfig('ZA');
    expect(config).not.toBeNull();
    expect(config!.areas).toHaveLength(1);
    expect(config!.searchRadiusMeters).toBe(50_000);
    expect(requestCount('ZA')).toBe(528);
  });
});
