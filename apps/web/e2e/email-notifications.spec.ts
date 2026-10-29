import { expect, test, type Page } from "@playwright/test";
import { renderActivityEmail } from "../../api/src/notifications/activity-email";
import { readFileSync } from 'node:fs';

async function setup(page: Page) {
  let settings = {
    emailTripNotifications: true,
    emailFollowNotifications: true,
    emailModerationNotifications: true,
  };
  let failNextSave = false;
  const payloads: unknown[] = [];
  await page.addInitScript(() =>
    localStorage.setItem("fairwayd_token", "test-token"),
  );
  await page.route("**/*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path.endsWith("/users/me"))
      return json({
        id: "viewer",
        handle: "viewer",
        name: "Test Golfer",
        privacy: "PRIVATE",
        termsAcceptedAt: "2026-01-01",
      });
    if (path.endsWith("/notifications/email-preferences")) {
      expect(route.request().headers().authorization).toBe("Bearer test-token");
      if (route.request().method() === "PATCH") {
        payloads.push(route.request().postDataJSON());
        if (failNextSave) {
          failNextSave = false;
          return json({ message: "Could not save settings." }, 503);
        }
        settings = { ...settings, ...route.request().postDataJSON() };
      }
      return json(settings);
    }
    if (path.startsWith("/api/")) return json({ items: [], count: 0 });
    return route.continue();
  });
  await page.goto("/privacy-security#email-notifications");
  return {
    payloads,
    failNext: () => {
      failNextSave = true;
    },
  };
}

for (const width of [390, 1280]) {
  test(`activity email layout is readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://stage.example.test/logo.png', route => route.fulfill({ contentType: 'image/png', body: readFileSync(new URL('../public/logo.png', import.meta.url)) }));
    const email = renderActivityEmail({ name: 'Alex', title: 'Added to trip', body: 'Jamie added you to “Thailand Golf Escape”. Open the trip to see your itinerary and travel plans.', link: '/trips/example', baseUrl: 'https://stage.example.test' });
    await page.setContent(email.html);
    await expect(page.getByRole('heading', { name: 'Added to trip' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Fairwayd', exact: true })).toHaveAttribute('href', 'https://stage.example.test/trips/example');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/activity-email-${width}.png`, fullPage: true });
  });
  test(`email settings persist independently and survive a failed save at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const api = await setup(page);
    const trip = page.getByRole("switch", { name: "Trip memberships" });
    const follow = page.getByRole("switch", { name: "Follow activity" });
    await expect(page.getByRole("switch", { name: "Content reviews" })).toHaveAttribute("aria-checked", "true");
    await expect(trip).toHaveAttribute("aria-checked", "true");
    await trip.click();
    await expect(trip).toHaveAttribute("aria-checked", "false");
    await expect(follow).toHaveAttribute("aria-checked", "true");
    expect(api.payloads).toEqual([{ emailTripNotifications: false }]);
    await page.reload();
    await expect(trip).toHaveAttribute("aria-checked", "false");
    api.failNext();
    await follow.click();
    await expect(page.getByRole("alert")).toContainText(
      "Could not save settings.",
    );
    await expect(follow).toHaveAttribute("aria-checked", "true");
    await follow.click();
    await expect(follow).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("status")).toContainText("settings saved");
    await expect(page.locator("#email-notifications")).toBeVisible();
    const switchBox = await trip.boundingBox();
    expect(switchBox?.width).toBeLessThanOrEqual(80);
    const labelBox = await page.locator('#email-notifications').getByText('When someone adds you to or removes you from a trip.', { exact: true }).boundingBox();
    expect(labelBox?.width).toBeGreaterThan(150);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator("#email-notifications")
      .screenshot({ path: `/tmp/email-settings-${width}.png` });
  });
}
