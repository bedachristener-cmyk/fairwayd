import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function setupNotificationBadgePage(page: Page) {
  let unreadCountRequests = 0;

  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_token", "e2e-token");
  });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (
      request.resourceType() === "image" &&
      url.hostname !== "127.0.0.1" &&
      url.hostname !== "localhost"
    ) {
      return route.fulfill({
        status: 204,
        contentType: "image/png",
        body: "",
      });
    }

    if (path === "/api/users/me" || path === "/users/me") {
      return json(route, {
        id: "user-b",
        handle: "userb",
        name: "User B",
        avatarUrl: "/avatar.png",
        termsAcceptedAt: "2026-01-01T00:00:00.000Z",
      });
    }

    if (
      path === "/api/notifications/unread-count" ||
      path === "/notifications/unread-count"
    ) {
      unreadCountRequests += 1;
      return json(route, { count: unreadCountRequests });
    }

    if (path === "/api/courses") return json(route, []);
    if (path === "/api/destinations") return json(route, { items: [] });
    if (path === "/api/destinations/discovery/tips") {
      return json(route, { items: [] });
    }
    if (path === "/api/courses/me/following") {
      return json(route, { items: [] });
    }
    if (path === "/api/trips") return json(route, []);
    if (path.startsWith("/api/")) return json(route, { items: [] });

    return route.continue();
  });

  await page.goto("/map");
  await expect
    .poll(() => unreadCountRequests, {
      message: "initial unread count request",
    })
    .toBeGreaterThan(0);

  return {
    getUnreadCountRequests: () => unreadCountRequests,
  };
}

test("notification badge refreshes when the window regains focus", async ({
  page,
}) => {
  const api = await setupNotificationBadgePage(page);
  const beforeFocus = api.getUnreadCountRequests();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
  });

  await expect
    .poll(() => api.getUnreadCountRequests())
    .toBeGreaterThan(beforeFocus);
});

test("notification badge refreshes when document visibility returns to visible", async ({
  page,
}) => {
  const api = await setupNotificationBadgePage(page);
  const beforeVisibilityReturn = api.getUnreadCountRequests();

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect
    .poll(() => api.getUnreadCountRequests())
    .toBeGreaterThan(beforeVisibilityReturn);
});

test("notification badge polls every 60 seconds while visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetInterval = window.setInterval.bind(window);
    (window as any).__fairwaydIntervalDelays = [];

    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      (window as any).__fairwaydIntervalDelays.push(timeout);
      return originalSetInterval(
        handler,
        timeout === 60_000 ? 50 : timeout,
        ...args,
      );
    }) as typeof window.setInterval;
  });

  const api = await setupNotificationBadgePage(page);
  const beforePolling = api.getUnreadCountRequests();

  await expect
    .poll(() => api.getUnreadCountRequests())
    .toBeGreaterThan(beforePolling);

  const intervalDelays = await page.evaluate(
    () => (window as any).__fairwaydIntervalDelays,
  );
  expect(intervalDelays).toContain(60_000);
});
