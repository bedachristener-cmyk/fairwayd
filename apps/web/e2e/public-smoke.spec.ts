import { expect, test } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Fairwayd").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore courses" })).toBeVisible();
});

test("destinations page loads and hides empty United States entry", async ({
  page,
}) => {
  await signInForSmokeTest(page);
  await page.goto("/destinations");

  await expect(
    page.getByRole("heading", { name: "Explore golf destinations" }),
  ).toBeVisible();
  await expect(page.getByText("Thailand").first()).toBeVisible();
  await expect(page.getByText("United Arab Emirates").first()).toBeVisible();
  await expect(page.getByText("Turkey").first()).toBeVisible();
  await expect(page.getByText("United States")).toHaveCount(0);
});

test("explore page loads", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByPlaceholder("Search courses")).toBeVisible();
  await expect(page.getByTitle("Standard map")).toBeVisible();
});

test("Thailand destination page loads", async ({ page }) => {
  await page.goto("/destinations/thailand");
  const main = page.getByRole("main");

  await expect(page.getByText("Golf destination").first()).toBeVisible();
  await expect(page.getByText("Thailand").first()).toBeVisible();
  await expect(
    main.getByText("Black Mountain Golf Club", { exact: true }),
  ).toBeVisible();
});

test("UAE destination page loads and shows course content", async ({ page }) => {
  await page.goto("/destinations/united-arab-emirates");
  const main = page.getByRole("main");

  await expect(page.getByText("Golf destination").first()).toBeVisible();
  await expect(page.getByText("United Arab Emirates").first()).toBeVisible();
  await expect(
    main.getByText("Emirates Golf Club", { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("Yas Links Abu Dhabi", { exact: true }),
  ).toBeVisible();
});

test("Turkey destination page loads and shows course content", async ({ page }) => {
  await page.goto("/destinations/turkey");
  const main = page.getByRole("main");

  await expect(page.getByText("Golf destination").first()).toBeVisible();
  await expect(page.getByText("Turkey").first()).toBeVisible();
  await expect(main.getByText("Carya Golf Club", { exact: true })).toBeVisible();
  await expect(
    main.getByText("Montgomerie Maxx Royal", { exact: true }),
  ).toBeVisible();
});
