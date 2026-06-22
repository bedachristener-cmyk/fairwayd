import { expect, test } from "@playwright/test";
import { mockFairwaydApi } from "./mock-api";

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
