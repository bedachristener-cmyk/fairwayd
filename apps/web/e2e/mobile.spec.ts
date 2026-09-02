import { expect, test } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";
import { allCourses, mockUser } from "./smoke-data";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("mobile navigation opens", async ({ page }) => {
  await page.goto("/map");

  await page.getByRole("button", { name: "Open main menu" }).click();

  await expect(page.getByRole("button", { name: "Close main menu" })).toBeVisible();
  await expect(page.getByText("Map / Explore")).toBeVisible();
  await expect(page.getByText("Destinations")).toBeVisible();
});

test("mobile page header exposes back navigation", async ({ page }) => {
  await page.goto("/friends");

  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
});

test("mobile feed composer overlays bottom navigation", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.route("**/api/posts/feed", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );

  await page.goto("/feed");
  await page.getByText("What's your golf moment?").click();
  await expect(page.getByRole("button", { name: "Close composer" })).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const navBox = document
          .querySelector(".fw-bottom-tabs")
          ?.getBoundingClientRect();

        if (!navBox) return false;

        const topElement = document.elementFromPoint(
          window.innerWidth / 2,
          navBox.top + navBox.height / 2,
        );

        return Boolean(
          topElement?.closest(".fw-feed-composer") &&
            !topElement.closest(".fw-bottom-tabs"),
        );
      }),
    )
    .toBe(true);

  const textarea = page.locator("textarea").first();
  await textarea.fill("Layering validation");
  await expect(textarea).toHaveValue("Layering validation");

  await page.getByRole("button", { name: "Close composer" }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
});

test("top rail search popover respects standalone safe area", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.goto("/feed");

  await page.evaluate(() => {
    document.body.classList.add("is-pwa-standalone");
    document.body.style.setProperty("--fw-safe-area-top", "24px");
  });

  const searchButtonCenter = await page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>("button[title]")]
      .map((element) => ({
        element,
        box: element.getBoundingClientRect(),
        title: element.getAttribute("title"),
      }))
      .find(
        ({ box, title }) =>
          title === "Find golfers" && box.width > 0 && box.height > 0,
      );

    if (!button) return null;

    return {
      x: button.box.left + button.box.width / 2,
      y: button.box.top + button.box.height / 2,
    };
  });

  expect(searchButtonCenter).not.toBeNull();
  await page.mouse.click(searchButtonCenter!.x, searchButtonCenter!.y);
  await expect(page.getByPlaceholder("Search golfers...")).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const railBox = document
          .querySelector(".fw-top-rail")
          ?.getBoundingClientRect();
        const input = [...document.querySelectorAll<HTMLInputElement>("input")].find(
          (element) => element.placeholder === "Search golfers...",
        );
        const popoverBox = input?.parentElement?.parentElement?.getBoundingClientRect();

        if (!railBox || !popoverBox) return false;

        return Math.round(popoverBox.top) >= Math.round(railBox.bottom);
      }),
    )
    .toBe(true);
});

test("user search result separates card and follow actions", async ({ page }) => {
  const warnings: string[] = [];
  const foundUser = {
    id: "mobile-found-user",
    handle: "adi",
    name: "Adi Example",
    avatarUrl: null,
  };
  let followCalls = 0;

  page.on("console", (message) => {
    if (message.type() === "warning") {
      warnings.push(message.text());
    }
  });

  await signInForSmokeTest(page);
  await page.route("**/api/users/search**", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([foundUser]),
    }),
  );
  await page.route(`**/api/users/id/${foundUser.id}/following-status`, async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "NONE" }),
    }),
  );
  await page.route(`**/api/users/id/${foundUser.id}/follow`, async (route) => {
    followCalls += 1;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "PENDING" }),
    });
  });

  await page.goto("/users");
  await page.getByPlaceholder("Search by name or handle...").fill("adi");
  await expect(page.getByText("Adi Example")).toBeVisible();

  await page.getByTitle("Follow this user").click();
  expect(followCalls).toBe(1);
  await expect(page).toHaveURL(/\/users$/);

  await page.getByRole("button", { name: /Adi Example/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/u\/adi$/);

  expect(
    warnings.some((warning) =>
      warning.includes("cannot appear as a descendant of <button>"),
    ),
  ).toBe(false);
});

test("course detail clears fixed mobile bottom navigation", async ({ page }) => {
  const course = allCourses[0];
  const post = {
    id: "mobile-course-post",
    content: "Mobile course detail layout check.",
    createdAt: "2026-08-31T12:00:00.000Z",
    visibility: "PUBLIC",
    user: mockUser,
    course,
    images: [],
    likes: [],
    comments: [],
    _count: { likes: 12, comments: 3 },
  };

  await signInForSmokeTest(page);
  await page.route("**/api/courses/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === `/api/courses/${course.id}` || path === `/api/courses/id/${course.id}`) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(course),
      });
    }

    if (path.endsWith("/rating-summary")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ overall: 4.4, count: 3, myRating: null }),
      });
    }

    if (path.endsWith("/follow-status")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ following: false }),
      });
    }

    return route.continue();
  });
  await page.route(`**/api/posts/course/${course.id}`, async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [post] }),
    }),
  );

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`/courses/${course.id}`);
  await expect(page.getByText(course.name).first()).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      })),
    )
    .toEqual({ scrollWidth: 375, clientWidth: 375 });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const navBox = document
          .querySelector(".fw-bottom-tabs")
          ?.getBoundingClientRect();

        if (!navBox) return [];

        return [...document.querySelectorAll("button,a,input,textarea,select")]
          .filter((element) => !element.closest(".fw-bottom-tabs"))
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              text:
                element.textContent?.trim() ||
                element.getAttribute("aria-label") ||
                element.getAttribute("placeholder") ||
                element.tagName,
              top: Math.round(box.top),
              bottom: Math.round(box.bottom),
            };
          })
          .filter(
            (box) => box.bottom > navBox.top + 2 && box.top < navBox.bottom - 2,
          );
      }),
    )
    .toEqual([]);
});
