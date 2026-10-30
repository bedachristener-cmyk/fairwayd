import { test, expect } from '@playwright/test';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
for (const width of [390, 1280]) {
  test(`course composer keeps a pending text post unpublished at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => { localStorage.setItem('fairwayd_token', 'author'); localStorage.setItem('fairwayd_lang', 'en'); });
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/users/me')) return json({ id: 'author', handle: 'author', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
      if (path === '/api/posts') return json({ status: 'PENDING_REVIEW', reviewId: 'text-reference' }, 202);
      if (path.startsWith('/api/')) return json({ items: [], count: 0 });
      return route.continue();
    });
    await page.goto('/compose/course');
    await page.getByPlaceholder('Share your round, trip or golf story...').fill('Text needing review');
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Your post is awaiting review' })).toContainText('text-reference');
    expect(new URL(page.url()).pathname).toBe('/compose/course');
    await expect(page.getByText('Posted!', { exact: true })).toHaveCount(0);
  });
  test(`pending submission has a clear notice and never enters the feed at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => { localStorage.setItem('fairwayd_token', 'author'); localStorage.setItem('fairwayd_lang', 'en'); });
    const course = { id: 'course', name: 'Test Golf Course', lat: 47, lon: 8, country: 'CH' };
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/*', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/users/me')) return json({ id: 'author', handle: 'author', name: 'Author', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
      if (path === '/api/posts' && req.method() === 'POST') { await gate; return json({ status: 'PENDING_REVIEW', reviewId: 'draft-reference' }, 202); }
      if (path === '/api/courses' || path === '/courses') return json([course]);
      if (path.endsWith('/courses/search')) return json({ items: [course] });
      if (path.startsWith('/api/')) return json({ items: [], count: 0 });
      return route.continue();
    });
    await page.goto('/feed');
    await page.locator('.fw-feed-composer-trigger').click();
    await page.locator('.fw-composer-course button').first().click();
    await page.getByPlaceholder('Search…', { exact: true }).fill('Test');
    await page.getByText('Test Golf Course', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Share your round, trip or golf story...' }).fill('This post is waiting for moderation');
    const request = page.waitForRequest(r => new URL(r.url()).pathname === '/api/posts' && r.method() === 'POST');
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await request;
    await expect(page.getByRole('button', { name: 'Post actions', exact: true })).toHaveCount(0);
    release();
    await expect(page.getByRole('status').filter({ hasText: 'Your post is awaiting review' })).toContainText('published automatically');
    await expect(page.getByRole('status').filter({ hasText: 'Your post is awaiting review' })).toContainText('draft-reference');
    await expect(page.getByRole('button', { name: 'Post actions', exact: true })).toHaveCount(0);
    await expect(page.getByText(/HTTP 422|CONTENT_REVIEW_REQUIRED/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/pending-submission-${width}.png`, fullPage: false });
  });

  test(`admin reviews all stored images and publishes once at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('fairwayd_token', 'admin'));
    let state = 'PENDING'; const decisions: unknown[] = [], auth: string[] = [];
    await page.route('**/*', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/users/me')) return json({ id: 'admin', handle: 'admin', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
      if (path === '/api/safety/admin/moderation/status') return json({ enabled: true, configured: true });
      if (path === '/api/safety/admin/moderation') return json([]);
      if (path === '/api/safety/admin/pending-changes') return json([]);
      if (path === '/api/safety/admin/pending-posts') return json([{ id: 'draft', state, content: state === 'PENDING' ? 'Complete private post' : '', courseId: 'course', visibility: 'PRIVATE', categories: ['violence'], expiresAt: '2026-12-01', user: { name: 'Test Author' }, images: state === 'PENDING' ? [{ id: 'first' }, { id: 'second' }] : [] }]);
      if (path.includes('/pending-posts/draft/images/')) { auth.push(req.headers().authorization); return route.fulfill({ status: 200, contentType: 'image/png', body: png }); }
      if (path === '/api/safety/admin/pending-posts/draft' && req.method() === 'PATCH') { decisions.push(req.postDataJSON()); state = 'APPROVED'; return json({ ok: true, postId: 'published' }); }
      if (path.startsWith('/api/')) return json({ items: [], count: 0 }); return route.continue();
    });
    await page.goto('/admin/moderation#draft');
    await expect(page.getByText('Test Author · Audience: PRIVATE')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Quarantined image for moderation' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Show all images for review' }).click();
    await expect(page.getByRole('img', { name: 'Quarantined image for moderation' })).toHaveCount(2);
    expect(auth.every(header => header === 'Bearer admin')).toBe(true);
    await page.screenshot({ path: `/tmp/pending-admin-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Approve and publish' }).click();
    await expect(page.getByRole('button', { name: 'Approve and publish' })).toHaveCount(0);
    expect(decisions).toEqual([{ decision: 'APPROVED' }]);
    await expect(page.getByRole('img', { name: 'Quarantined image for moderation' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
