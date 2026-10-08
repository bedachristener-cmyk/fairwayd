import { expect, test } from "@playwright/test";
import { mockFairwaydApi } from "./mock-api";

const COURSE_ID = "course-th-black-mountain";
const REAL_IMAGE = "/uploads/black-mountain-real.jpg";

async function mockCoursePostsWithRealImage(page: import("@playwright/test").Page) {
  await page.route(`**/api/posts/course/${COURSE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "course-post-image",
            content: "A real course photo.",
            createdAt: "2026-01-01T12:00:00.000Z",
            visibility: "PUBLIC",
            course: { id: COURSE_ID, name: "Black Mountain Golf Club", lat: 12.63, lon: 99.89 },
            user: { id: "image-user", handle: "golfer" },
            images: [{ id: "image-1", url: REAL_IMAGE }],
          },
        ],
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("Course Detail keeps a real post image free of the AI disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockCoursePostsWithRealImage(page);
  await page.goto(`/courses/${COURSE_ID}`);

  const hero = page.locator(".fw-course-desktop-hero__image");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute("src", /black-mountain-real\.jpg/);
  await expect(page.getByText("AI-generated image", { exact: true })).toHaveCount(0);
});

test("Course Detail discloses an AI fallback image", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`/courses/${COURSE_ID}`);

  await expect(page.locator(".fw-course-desktop-hero__image")).toHaveAttribute(
    "src",
    /thailand-golf-destination\.jpg/,
  );
  await expect(page.getByText("AI-generated image", { exact: true })).toBeVisible();
});

test("mobile Map preview uses a real post image without an AI disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCoursePostsWithRealImage(page);
  await page.goto("/map");

  const search = page.getByRole("textbox", { name: "Search courses" });
  await search.fill("Black Mountain");
  await page.getByRole("button", { name: "Black Mountain Golf Club" }).click();

  const preview = page.getByTestId("map-course-preview-image");
  await expect(preview).toBeVisible();
  await expect(preview.locator("img")).toHaveAttribute("src", /black-mountain-real\.jpg/);
  await expect(preview.getByText("AI-generated image", { exact: true })).toHaveCount(0);
});

test("mobile Map preview discloses the fallback and retains course actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/map");

  const search = page.getByRole("textbox", { name: "Search courses" });
  await search.fill("Black Mountain");
  await page.getByRole("button", { name: "Black Mountain Golf Club" }).click();

  const preview = page.getByTestId("map-course-preview-image");
  await expect(preview).toBeVisible();
  await expect(preview.locator("img")).toHaveAttribute(
    "src",
    /thailand-golf-destination\.jpg/,
  );
  await expect(preview.getByText("AI-generated image", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", { name: "Open Course" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check on Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bring me there" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);

  await page.getByRole("button", { name: "Open Course" }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${COURSE_ID}$`));
});

test("mobile Map ignores a stale image response after selecting another course", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  let releaseOldResponse!: () => void;
  const oldResponseReleased = new Promise<void>((resolve) => {
    releaseOldResponse = resolve;
  });
  let oldResponseFinished!: () => void;
  const oldResponseComplete = new Promise<void>((resolve) => {
    oldResponseFinished = resolve;
  });

  await page.route(`**/api/posts/course/${COURSE_ID}`, async (route) => {
    await oldResponseReleased;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: "stale-image", images: [{ id: "stale", url: REAL_IMAGE }] }],
      }),
    });
    oldResponseFinished();
  });

  await page.goto("/map");
  const search = page.getByRole("textbox", { name: "Search courses" });
  await search.fill("Black Mountain");
  await page.getByRole("button", { name: "Black Mountain Golf Club" }).click();

  await search.fill("Fancourt");
  await page.getByRole("button", { name: "Fancourt" }).click();

  const previewImage = page.getByTestId("map-course-preview-image").locator("img");
  await expect(previewImage).toHaveAttribute("src", /south-africa-hero\.jpg/);

  releaseOldResponse();
  await oldResponseComplete;

  await expect(previewImage).toHaveAttribute("src", /south-africa-hero\.jpg/);
});

test("mobile Map ignores a stale image request failure after selecting another course", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  let releaseOldFailure!: () => void;
  const oldFailureReleased = new Promise<void>((resolve) => {
    releaseOldFailure = resolve;
  });
  let oldFailureFinished!: () => void;
  const oldFailureComplete = new Promise<void>((resolve) => {
    oldFailureFinished = resolve;
  });

  await page.route(`**/api/posts/course/${COURSE_ID}`, async (route) => {
    await oldFailureReleased;
    await route.fulfill({ status: 500, body: "Old request failed" });
    oldFailureFinished();
  });

  await page.goto("/map");
  const search = page.getByRole("textbox", { name: "Search courses" });
  await search.fill("Black Mountain");
  await page.getByRole("button", { name: "Black Mountain Golf Club" }).click();

  await search.fill("Fancourt");
  await page.getByRole("button", { name: "Fancourt" }).click();

  const previewImage = page.getByTestId("map-course-preview-image").locator("img");
  await expect(previewImage).toHaveAttribute("src", /south-africa-hero\.jpg/);

  releaseOldFailure();
  await oldFailureComplete;

  await expect(previewImage).toHaveAttribute("src", /south-africa-hero\.jpg/);
});
