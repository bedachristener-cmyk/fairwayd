import type { Page, Route } from "@playwright/test";
import { allCourses, coursesByCountry, destinations, mockUser } from "./smoke-data";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function emptyImage(route: Route) {
  return route.fulfill({
    status: 204,
    contentType: "image/png",
    body: "",
  });
}

export async function mockFairwaydApi(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (
      request.resourceType() === "image" &&
      url.hostname !== "127.0.0.1" &&
      url.hostname !== "localhost"
    ) {
      return emptyImage(route);
    }

    if (path === "/api/users/me" || path === "/users/me") {
      return json(route, mockUser);
    }

    if (path === "/api/courses") {
      return json(route, allCourses);
    }

    if (path === "/api/destinations") {
      return json(route, { items: destinations });
    }

    if (path === "/api/destinations/discovery/tips") {
      return json(route, { items: [] });
    }

    const countryMatch = path.match(/^\/api\/courses\/by-country\/([^/]+)$/);
    if (countryMatch) {
      return json(route, { items: coursesByCountry[countryMatch[1]] ?? [] });
    }

    if (path === "/api/courses/me/following") {
      return json(route, { items: [] });
    }

    const destinationNestedMatch = path.match(
      /^\/api\/destinations\/([^/]+)\/(tips|posts|follow-status)$/,
    );
    if (destinationNestedMatch) {
      const [, slug, resource] = destinationNestedMatch;
      const destination = destinations.find((item) => item.slug === slug);

      if (resource === "follow-status") {
        return json(route, {
          following: false,
          followerCount: destination?.followerCount ?? 0,
        });
      }

      return json(route, { items: [] });
    }

    const destinationMatch = path.match(/^\/api\/destinations\/([^/]+)$/);
    if (destinationMatch) {
      const destination = destinations.find(
        (item) => item.slug === destinationMatch[1],
      );

      return destination
        ? json(route, destination)
        : route.fulfill({ status: 404, body: "Not found" });
    }

    return route.continue();
  });
}

export async function signInForSmokeTest(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_token", "e2e-token");
  });
}
