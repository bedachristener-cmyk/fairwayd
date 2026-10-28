import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`spectator uses the normal trip views read only at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const protectedRequests: string[] = [];
    const mutations: string[] = [];
    await page.addInitScript(() => localStorage.setItem('fairwayd_token', 'test-token'));
    await page.route('**/*', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) mutations.push(path);
      if (path.endsWith('/users/me')) return json({ id: 'viewer', handle: 'viewer', termsAcceptedAt: '2026-01-01', name: 'Viewer', avatarUrl: '/logo.png' });
      if (path === '/api/trips/trip-spectator') return json({ id: 'trip-spectator', title: 'Thailand Golf', destination: 'Hua Hin', viewerRole: 'VIEWER', members: [{ id: 'owner', userId: 'organizer', role: 'OWNER', user: { id: 'organizer', name: 'Organizer', handle: 'organizer' } }], items: [{ id: 'item', type: 'COURSE', title: 'Seapine Golf', visibility: 'GROUP', date: '2027-02-20', startTime: '09:44', course: { id: 'seapine', name: 'Seapine Golf', lat: 12.5, lon: 99.9 } }] });
      if (path === '/api/courses/seapine/cover-image') return json({ image: { id: 'cover', url: '/logo.png' }, isSelected: true });
      if (/\/trips\/trip-spectator\/(documents|my-costs|organizer-costs|activity)/.test(path)) { protectedRequests.push(path); return json({}); }
      if (path.startsWith('/api/')) return json({ items: [], count: 0 });
      return route.continue();
    });
    await page.goto('/trips/trip-spectator');
    await expect(page.getByText('Spectator · Read only')).toBeVisible();
    await expect(page.locator('.fw-trip-detail-hero')).toContainText('Thailand Golf');
    await expect(page.getByText('Organizer', { exact: true })).toBeVisible();
    for (const name of ['Budget', 'Documents', 'Checklist', 'My Costs', 'Trip Cost Sheet', 'All trip costs', 'Before you go']) {
      await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    }
    const assertReadOnly = async () => {
      await expect(page.getByRole('button', { name: /^(Edit|Edit Trip|Upload Cover|Invite|Add item|\+ Add item|Remove|Save costs|\+ Add cost|Delete)$/ })).toHaveCount(0);
      expect(protectedRequests).toEqual([]);
      expect(mutations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await assertReadOnly();
    await page.screenshot({ path: `/tmp/trip-spectator-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /Timeline/ }).click();
    await expect(page.getByText('Seapine Golf', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Details', exact: true }).first().click();
    const details = page.getByRole('dialog');
    await expect(details).toContainText('Seapine Golf');
    await expect(details.getByText('Documents', { exact: true })).toHaveCount(0);
    await expect(details.getByText('Costs', { exact: true })).toHaveCount(0);
    await assertReadOnly();
    await details.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Back to trip', exact: true }).click();
    await page.getByRole('button', { name: /Calendar/ }).click();
    await expect(page.getByText('Seapine Golf', { exact: true }).first()).toBeVisible();
    await assertReadOnly();
    await page.screenshot({ path: `/tmp/trip-spectator-calendar-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back to trip', exact: true }).click();
    await page.getByRole('button', { name: /^Map/ }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await assertReadOnly();
  });
}
