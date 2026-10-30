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
    await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(0);
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
    // A viewport capture preserves the calendar state. Chromium full-page
    // captures can resize the responsive shell and remount its route subtree.
    await expect(page.getByRole('button', { name: 'Back to trip', exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/trip-spectator-calendar-${width}.png`, fullPage: false });
    await page.getByRole('button', { name: 'Back to trip', exact: true }).click();
    await page.getByRole('button', { name: 'Map Stops and route', exact: true }).click();
    await expect(page.locator('[data-trip-swipe-ignore="true"] .leaflet-container')).toBeVisible();
    await assertReadOnly();
  });
}

for (const width of [390, 1280]) {
  for (const language of ['en', 'de']) {
    test(`Thailand entry links and checklist remain separate at ${width}px in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(lang => { localStorage.setItem('fairwayd_token', 'test-token'); localStorage.setItem('fairwayd_lang', lang); }, language);
      const mutations: string[] = [];
      await page.route('**/*', async route => {
        const request = route.request(); const path = new URL(request.url()).pathname;
        const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        if (path.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) mutations.push(path);
        if (path.endsWith('/users/me')) return json({ id: 'owner', handle: 'owner', name: 'Owner', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
        if (path === '/api/trips/entry-test') return json({ id: 'entry-test', title: 'Golf holiday', destination: 'Hua Hin', viewerRole: 'OWNER', members: [{ id: 'owner-member', userId: 'owner', role: 'OWNER', user: { id: 'owner', name: 'Owner' } }], items: [{ id: 'golf', type: 'COURSE', title: 'Seapine', course: { id: 'seapine', name: 'Seapine', country: 'TH' } }], documents: [] });
        if (path === '/api/courses/seapine/cover-image') return json({ image: null });
        if (path.endsWith('/my-costs')) return json({ baseCurrency: 'CHF', costs: [], summary: { totalPersonalShare: 0, totalPaidByMe: 0, balancePreview: 0, groupedByCategory: {}, missingConversionCount: 0 } });
        if (path.endsWith('/organizer-costs')) return json({ baseCurrency: 'CHF', costs: [], summary: { totalTripCost: 0, missingConversionCount: 0, paidBySummary: [], memberShareSummary: [], balancePreview: [] } });
        if (path.startsWith('/api/')) return json({ items: [], costs: [], count: 0 });
        return route.continue();
      });
      await page.goto('/trips/entry-test');
      const entry = page.locator('[data-trip-entry-requirements]');
      await expect(entry).toBeVisible();
      await expect(entry.locator('article')).toHaveCount(2);
      await expect(entry.locator('a').nth(0)).toHaveAttribute('href', 'https://tdac.immigration.go.th/');
      await expect(entry.locator('a').nth(1)).toHaveAttribute('href', 'https://www.thaievisa.go.th/');
      await expect(entry.locator('a').nth(0)).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(entry.locator('time')).toHaveAttribute('datetime', '2026-10-30');
      await expect(entry).toContainText(language === 'de' ? 'Ankunft, nicht der Abflug' : 'arrival, not your departure');
      await expect(entry).toContainText(language === 'de' ? 'kein Visum' : 'not a visa');
      const checklist = page.getByRole('checkbox', { name: 'Visa / eVisa', exact: true });
      await checklist.check();
      await page.reload();
      await expect(checklist).toBeChecked();
      await expect(entry.locator('article')).toHaveCount(2);
      expect(mutations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await entry.screenshot({ path: `/tmp/trip-spectator-entry-${language}-${width}.png` });
    });
  }
}

test('Thailand requirements are not shown for another destination', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fairwayd_token', 'test-token'));
  await page.route('**/*', route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/users/me')) return json({ id: 'owner', handle: 'owner', name: 'Owner', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
    if (path === '/api/trips/entry-other') return json({ id: 'entry-other', title: 'Golf holiday', destination: 'France', viewerRole: 'OWNER', members: [{ id: 'owner-member', userId: 'owner', role: 'OWNER', user: { id: 'owner', name: 'Owner' } }], items: [], documents: [] });
    if (path.endsWith('/my-costs')) return json({ baseCurrency: 'CHF', costs: [], summary: { totalPersonalShare: 0, totalPaidByMe: 0, balancePreview: 0, groupedByCategory: {}, missingConversionCount: 0 } });
    if (path.endsWith('/organizer-costs')) return json({ baseCurrency: 'CHF', costs: [], summary: { totalTripCost: 0, missingConversionCount: 0, paidBySummary: [], memberShareSummary: [], balancePreview: [] } });
    if (path.startsWith('/api/')) return json({ items: [], costs: [], count: 0 });
    return route.continue();
  });
  await page.goto('/trips/entry-other');
  await expect(page.getByText('Before you go', { exact: true })).toBeVisible();
  await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(0);
});
