import { test, expect, type Page } from '@playwright/test';
const course = { id: 'course', name: 'Test Golf Course', country: 'CH', lat: 47.5596, lon: 7.5886 };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
async function setup(page: Page, mode: 'allow' | 'deny' | 'timeout' | 'missing' = 'allow', standalone = false) {
  await page.addInitScript(({ mode, standalone }) => {
    localStorage.setItem('fairwayd_token', 'device-test'); localStorage.setItem('fairwayd_lang', 'en');
    const w = window as any; w.__geoCalls = 0; w.__watchCalls = 0; w.__streamCalls = 0;
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: standalone });
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: mode === 'missing' ? undefined : {
      getCurrentPosition: (success: any, failure: any) => { w.__geoCalls++; setTimeout(() => mode === 'allow' ? success({ coords: { latitude: 47.5596, longitude: 7.5886, accuracy: 50 }, timestamp: Date.now() }) : failure({ code: mode === 'deny' ? 1 : 3 }), 0); },
      watchPosition: () => { w.__watchCalls++; return 1; }, clearWatch: () => {},
    } });
    // A previously granted browser permission must still not cause a startup read.
    if (navigator.permissions) { const query = navigator.permissions.query.bind(navigator.permissions); navigator.permissions.query = ((request: any) => request.name === 'geolocation' ? Promise.resolve({ state: 'granted' }) : query(request)) as any; }
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = (async () => { w.__streamCalls++; throw new Error('No camera stream should be requested'); }) as any;
  }, { mode, standalone });
  await page.route('**/*', route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/users/me')) return json({ id: 'device-test', handle: 'device_test', name: 'Device User', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
    if (path.endsWith('/admin-status')) return json({ isAdmin: false });
    if (path === '/api/courses' || path === '/courses') return json([course]);
    if (path.endsWith('/courses/search')) return json({ items: [course] });
    if (path === '/api/courses/nearby') return json({ items: [course], count: 1 });
    if (path.startsWith('/api/')) return json({ items: [], count: 0 });
    if (/openstreetmap|arcgisonline|cartocdn/.test(url.hostname)) return route.abort();
    return route.continue();
  });
}
const geoCalls = (page: Page) => page.evaluate(() => (window as any).__geoCalls);
for (const width of [390, 1280]) {
  test(`location is explicit, cancellable and not read by startup/sidebar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page, 'allow', width === 390);
    await page.goto('/feed'); await expect(page.locator('.fw-feed-composer-trigger')).toBeVisible(); expect(await geoCalls(page)).toBe(0);
    await page.goto('/map'); const locate = page.getByRole('button', { name: 'My location', exact: true }); await expect(locate).toBeVisible(); expect(await geoCalls(page)).toBe(0);
    await locate.click(); const dialog = page.getByRole('dialog', { name: 'Use your location?', exact: true });
    await expect(dialog).toContainText('coordinates and the search radius'); expect(await geoCalls(page)).toBe(0);
    await dialog.getByRole('button', { name: 'Not now', exact: true }).click(); expect(await geoCalls(page)).toBe(0); await expect(dialog).toHaveCount(0);
    await expect(locate).toBeFocused();
    await locate.click(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); expect(await geoCalls(page)).toBe(0);
    await locate.click(); await page.screenshot({ path: `/tmp/device-access-location-${width}.png`, fullPage: false });
    await dialog.getByRole('button', { name: 'Use location', exact: true }).click(); await expect.poll(() => geoCalls(page)).toBe(1);
    await expect(dialog).toHaveCount(0); expect(await page.evaluate(() => (window as any).__watchCalls)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test(`Near Me asks before using location and keeps its manual fallback at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page, 'allow', width === 390);
    await page.goto('/golf-near-me'); expect(await geoCalls(page)).toBe(0);
    await page.getByRole('button', { name: 'Use my location', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); expect(await geoCalls(page)).toBe(0);
    await page.getByRole('button', { name: 'Not now', exact: true }).click(); await page.getByRole('button', { name: 'Basel pilot', exact: true }).click(); expect(await geoCalls(page)).toBe(0);
    await page.getByRole('button', { name: 'Use my location', exact: true }).click(); await page.getByRole('button', { name: 'Use location', exact: true }).click(); await expect.poll(() => geoCalls(page)).toBe(1);
  });
  test(`camera cancellation, confirmation and existing-photo alternative at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page, 'allow', width === 390);
    let fileChoosers = 0, published = 0;
    page.on('filechooser', () => fileChoosers++);
    page.on('request', req => { if (new URL(req.url()).pathname === '/api/posts' && req.method() === 'POST') published++; });
    await page.goto('/feed'); await page.locator('.fw-feed-composer-trigger').click();
    const camera = page.getByRole('button', { name: /📸 Camera/ }); await camera.click();
    const dialog = page.getByRole('dialog', { name: 'Take a photo?', exact: true }); await expect(dialog).toContainText('not general access to your photo library'); expect(fileChoosers).toBe(0);
    await dialog.getByRole('button', { name: 'Not now', exact: true }).click(); expect(fileChoosers).toBe(0);
    await camera.click(); await page.screenshot({ path: `/tmp/device-access-camera-${width}.png`, fullPage: false });
    const next = page.waitForEvent('filechooser'); await dialog.getByRole('button', { name: 'Open camera', exact: true }).click(); const chooser = await next;
    expect(await chooser.element().getAttribute('capture')).toBe('environment'); expect(chooser.isMultiple()).toBe(false);
    await chooser.setFiles([]); await expect(dialog).toHaveCount(0);
    await camera.click(); const gallery = page.waitForEvent('filechooser'); await dialog.getByRole('button', { name: 'Choose an existing image', exact: true }).click(); const existing = await gallery;
    expect(existing.isMultiple()).toBe(true); expect(await existing.element().getAttribute('capture')).toBeNull();
    await existing.setFiles({ name: 'golf.png', mimeType: 'image/png', buffer: png }); expect(fileChoosers).toBe(2); expect(published).toBe(0);
    expect(await page.evaluate(() => (window as any).__streamCalls)).toBe(0); expect(await geoCalls(page)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
for (const mode of ['deny', 'timeout', 'missing'] as const) {
  test(`location ${mode} leaves manual map search usable`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 }); await setup(page, mode);
    await page.goto('/map'); await page.getByRole('button', { name: 'My location', exact: true }).click();
    if (mode !== 'missing') await page.getByRole('button', { name: 'Use location', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(mode === 'deny' ? 'blocked' : mode === 'timeout' ? 'timed out' : 'not supported');
    await page.getByPlaceholder('Search courses', { exact: true }).fill('Test'); await expect(page.getByText('Test Golf Course', { exact: true }).first()).toBeVisible();
    expect(await geoCalls(page)).toBe(mode === 'missing' ? 0 : 1);
  });
}
test('device access help is available in privacy settings without reading sensors', async ({ page }) => {
  await setup(page); await page.goto('/privacy-security');
  await expect(page.getByRole('heading', { name: 'Location, camera and photos', exact: true })).toBeVisible();
  await expect(page.locator('#device-access')).toContainText('withdraw permissions'); expect(await geoCalls(page)).toBe(0);
});
