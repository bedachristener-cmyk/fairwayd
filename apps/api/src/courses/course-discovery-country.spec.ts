import {
  courseDiscoveryCountryConfig,
  supportedCourseDiscoveryCountries,
} from './course-discovery-country';
import { buildDiscoveryGrid } from './course-completeness-review';

describe('course discovery country configuration', () => {
  it('keeps Switzerland and Austria explicit and deterministic', () => {
    expect(supportedCourseDiscoveryCountries()).toEqual(['AT', 'CH']);
    expect(courseDiscoveryCountryConfig('at')?.country).toBe('AT');
    expect(courseDiscoveryCountryConfig('DE')).toBeNull();
  });

  it('produces a bounded Austrian request plan', () => {
    const config = courseDiscoveryCountryConfig('AT');
    expect(config).not.toBeNull();
    const grid = buildDiscoveryGrid(
      config!.bounds,
      config!.latStep,
      config!.lonStep,
    );
    expect(grid.length).toBeGreaterThan(200);
    expect(grid.length).toBeLessThan(300);
  });
});
