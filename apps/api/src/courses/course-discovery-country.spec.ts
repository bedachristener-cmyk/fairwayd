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
    expect(supportedCourseDiscoveryCountries()).toEqual(['AT', 'CH', 'TH']);
    expect(courseDiscoveryCountryConfig('at')?.country).toBe('AT');
    expect(courseDiscoveryCountryConfig('th')?.country).toBe('TH');
    expect(courseDiscoveryCountryConfig('DE')).toBeNull();
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
});
