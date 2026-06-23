import { expect, test } from "@playwright/test";
import { mockFairwaydApi } from "./mock-api";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("Explore map renders container", async ({
  page,
}) => {
  await page.goto("/map");

  await expect(page.getByPlaceholder("Search courses")).toBeVisible();

  const map = page.locator(".leaflet-container").first();
  await expect(map).toBeVisible();
});

test("Explore map renders mocked course cards", async ({ page }) => {
  await page.goto("/map?search=courses");

  await page.getByPlaceholder("Search courses").fill("Golf");

  await expect(
    page.getByRole("button", { name: /Black Mountain Golf Club/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Abu Dhabi Golf Club/ }),
  ).toBeVisible();
});

test("Explore map course card opens expected course preview", async ({
  page,
}) => {
  await page.goto("/map?search=courses");

  await page.getByPlaceholder("Search courses").fill("Yas Links");
  await page.getByRole("button", { name: /Yas Links Abu Dhabi/ }).click();

  await expect(page.getByText("Yas Links Abu Dhabi").first()).toBeVisible();
  await expect(page.getByText("Abu Dhabi, AE")).toBeVisible();
});
