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

    if (path === "/api/posts/feed") {
      const course = allCourses[0];
      return json(route, {
        items: course
          ? [
              {
                id: "post-feed-1",
                content: "Backend post text stays unchanged.",
                createdAt: "2026-01-01T12:00:00.000Z",
                visibility: "PUBLIC",
                course,
                user: mockUser,
                images: [],
                likes: [],
                comments: [],
                _count: { likes: 0, comments: 0 },
              },
            ]
          : [],
      });
    }

    const coursePostsMatch = path.match(/^\/api\/posts\/course\/([^/]+)$/);
    if (coursePostsMatch) {
      return json(route, { items: [] });
    }

    const ratingMatch = path.match(/^\/api\/ratings\/([^/]+)$/);
    if (ratingMatch) {
      return json(route, {
        overall: 4.4,
        count: 1,
        breakdown: {
          condition: 4.2,
          layout: 4.5,
          scenery: 4.6,
          value: 4.1,
        },
      });
    }

    const myRatingMatch = path.match(/^\/api\/ratings\/me\/([^/]+)$/);
    if (myRatingMatch) {
      return json(route, {
        overall: 4.2,
        condition: 4.0,
        layout: 4.4,
        scenery: 4.5,
        value: 4.0,
      });
    }

    const courseDetailMatch = path.match(/^\/api\/courses\/([^/]+)$/);
    if (courseDetailMatch) {
      const course = allCourses.find((item) => item.id === courseDetailMatch[1]);
      return course
        ? json(route, course)
        : route.fulfill({ status: 404, body: "Not found" });
    }

    const courseFollowingMatch = path.match(/^\/api\/courses\/([^/]+)\/following$/);
    if (courseFollowingMatch) {
      return json(route, { following: false });
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
