import { golfServiceBoundingBox, golfServiceDistanceKm } from './golf-services.geo';

describe('Golf Near Me geographical helpers', () => {
  it('returns zero for identical coordinates and short distances near Basel', () => {
    expect(golfServiceDistanceKm(47.55, 7.59, 47.55, 7.59)).toBe(0);
    const distance = golfServiceDistanceKm(47.55, 7.59, 47.56, 7.60);
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(2);
  });

  it('supports crossing the international date line', () => {
    expect(golfServiceDistanceKm(0, 179.9, 0, -179.9)).toBeLessThan(25);
    const bounds = golfServiceBoundingBox(0, 179.9, 100);
    expect(bounds.east).toBeGreaterThan(180);
  });

  it('builds a conservative rectangle and handles near-pole coordinates', () => {
    const bounds = golfServiceBoundingBox(47.55, 7.59, 50);
    expect(bounds.minLat).toBeLessThan(47.55);
    expect(bounds.maxLat).toBeGreaterThan(47.55);
    expect(bounds.west).toBeLessThan(7.59);
    expect(bounds.east).toBeGreaterThan(7.59);
    expect(golfServiceBoundingBox(90, 20, 50).allLongitudes).toBe(true);
  });
});
