import { expect, test } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("desktop landing presents a floating header and login card within the hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  const hero = page.getByTestId("landing-hero");
  const header = page.getByTestId("landing-header");
  const login = page.getByTestId("landing-login-card");
  const destinations = page.getByRole("heading", {
    name: "Find your next place to play",
  });
  await expect(hero).toBeVisible();
  await expect(header).toBeVisible();
  await expect(login).toBeVisible();

  const [heroBox, headerBox, loginBox, destinationsBox] = await Promise.all([
    hero.boundingBox(),
    header.boundingBox(),
    login.boundingBox(),
    destinations.boundingBox(),
  ]);
  expect(heroBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(loginBox).not.toBeNull();
  expect(destinationsBox).not.toBeNull();
  expect(loginBox!.x).toBeGreaterThan(heroBox!.x + heroBox!.width * 0.58);
  expect(loginBox!.x + loginBox!.width).toBeLessThanOrEqual(
    heroBox!.x + heroBox!.width,
  );
  expect(loginBox!.y).toBeGreaterThan(headerBox!.y + headerBox!.height);
  expect(destinationsBox!.y).toBeGreaterThan(loginBox!.y + loginBox!.height);
  await expect(login).toHaveCSS("position", "absolute");
});

test("mobile landing uses the intended single-column order without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hero = page.getByTestId("landing-hero-copy");
  const login = page.getByTestId("landing-login-card");
  const destinations = page.getByRole("heading", {
    name: "Find your next place to play",
  });
  const about = page.locator("#what-is-fairwayd");

  const [heroBox, loginBox, destinationsBox, aboutBox] = await Promise.all([
    hero.boundingBox(),
    login.boundingBox(),
    destinations.boundingBox(),
    about.boundingBox(),
  ]);
  expect(loginBox!.y).toBeGreaterThan(heroBox!.y + heroBox!.height - 2);
  expect(destinationsBox!.y).toBeGreaterThan(loginBox!.y + loginBox!.height);
  expect(aboutBox!.y).toBeGreaterThan(destinationsBox!.y);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
});

test("Explore courses still routes to the map", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".fw-landing__actions")
    .getByRole("button", { name: "Explore courses" })
    .click();
  await expect(page).toHaveURL(/\/map$/);
});

test("desktop header uses existing navigation targets", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  const header = page.getByTestId("landing-header");
  await expect(header.getByRole("button", { name: "Courses", exact: true })).toBeVisible();
  await expect(header.getByRole("button", { name: "Map", exact: true })).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Destinations", exact: true }),
  ).toBeVisible();
  await expect(header.getByLabel("Language")).toHaveValue("en");

  await header.getByRole("button", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
});

test("header Sign in reaches and highlights the login panel", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  const panel = page.getByTestId("landing-login-panel");
  await page
    .getByTestId("landing-header")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();

  await expect(panel).toHaveClass(/is-highlighted/);
  await expect(panel.locator('input[type="email"]')).toBeFocused();
});

test("header Destinations preserves the existing signed-out gate", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  await page
    .getByTestId("landing-header")
    .getByRole("button", { name: "Destinations", exact: true })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("landing-login-panel")).toHaveClass(/is-highlighted/);
  await expect(page.getByRole("status")).toContainText("Sign in to explore destinations");
});

test("header About targets the About section", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  await page
    .getByTestId("landing-header")
    .getByRole("button", { name: "About", exact: true })
    .click();
  await expect(page.locator("#what-is-fairwayd")).toBeInViewport();
});

test("Sign in scrolls to, highlights, and focuses the login panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const panel = page.getByTestId("landing-login-panel");
  await page
    .locator(".fw-landing__actions")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();

  await expect(panel).toHaveClass(/is-highlighted/);
  await expect(panel.locator('input[type="email"]')).toBeFocused();
  await expect(panel).toBeInViewport();
});

test("What is Fairwayd targets the About section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page
    .locator(".fw-landing__actions")
    .getByRole("button", { name: /What is Fairwayd/ })
    .click();
  await expect(page.locator("#what-is-fairwayd")).toBeInViewport();
});

test("authenticated root visits retain the post-login redirect", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/feed$/);
});

test("landing copy uses the existing language preference", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Alles rund um Golf an einem Ort" }),
  ).toBeVisible();
  await expect(page.getByText("Beliebte Golfdestinationen")).toBeVisible();
});
