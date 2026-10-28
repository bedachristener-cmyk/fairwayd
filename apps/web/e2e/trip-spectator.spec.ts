import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`spectator reads the itinerary without loading protected trip features at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const protectedRequests: string[] = [];
    await page.addInitScript(() => localStorage.setItem('fairwayd_token', 'test-token'));
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/users/me')) return json({ id: 'viewer', handle: 'viewer', termsAcceptedAt: '2026-01-01', name: 'Viewer' });
      if (path === '/api/trips/trip-spectator') return json({ id: 'trip-spectator', title: 'Thailand Golf', destination: 'Hua Hin', viewerRole: 'VIEWER', members: [], items: [{ id: 'item', type: 'golf_round', title: 'Seapine Golf', date: '2027-02-20', startTime: '09:44' }] });
      if (/\/trips\/trip-spectator\/(documents|my-costs|organizer-costs|activity)/.test(path)) { protectedRequests.push(path); return json({}); }
      if (path.startsWith('/api/')) return json({ items: [], count: 0 });
      return route.continue();
    });
    await page.goto('/trips/trip-spectator');
    await expect(page.getByRole('heading', { name: 'Thailand Golf' })).toBeVisible();
    await expect(page.getByText('Spectator · Read only')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seapine Golf' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add item|Save|Upload|Edit trip/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Feed', exact: true }).first()).toBeVisible();
    expect(protectedRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/trip-spectator-${width}.png`, fullPage: true });
  });
}
