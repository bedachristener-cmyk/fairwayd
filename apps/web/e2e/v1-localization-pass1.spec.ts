import { expect, test } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";
import { allCourses } from "./smoke-data";

const courseId = allCourses[0]?.id ?? "course-e2e";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

test("German localizes V1 feed filters and composer prompt", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/feed");

  await expect(page.getByRole("button", { name: "👥 Folge ich" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Golfplaetze/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "🌍 Reisen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "🔥 Trending" })).toBeVisible();
  await expect(page.getByText("Was ist dein Golfmoment?")).toBeVisible();
  await expect(page.getByText("Platz bewerten")).toBeVisible();
});

test("German localizes course rating and actions", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`/courses/${courseId}?openRating=1`);

  await expect(page.getByText("Platzbewertung").first()).toBeVisible();
  await expect(page.getByText("Bewertung bearbeiten").first()).toBeVisible();
  await expect(page.getByText("Hier posten")).toBeVisible();
});

test("German localizes explore headings and map labels", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });

  await page.goto("/destinations");
  await expect(page.getByRole("heading", { name: "Golfdestinationen entdecken" })).toBeVisible();
  await expect(page.getByText("Beliebte Destinationen")).toBeVisible();

  await page.goto("/map?search=courses");
  await expect(page.getByPlaceholder("Golfplaetze suchen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Karte", description: "Standardkarte" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Satellit", description: "Satellit Hybrid" })).toBeVisible();
});

test("English still renders V1 feed, course, explore, and map labels", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "en");
  });

  await page.goto("/feed");
  await expect(page.getByText("What's your golf moment?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Golf courses/ })).toBeVisible();

  await page.goto(`/courses/${courseId}?openRating=1`);
  await expect(page.getByText("Course rating").first()).toBeVisible();
  await expect(page.getByText("Edit your rating").first()).toBeVisible();

  await page.goto("/destinations");
  await expect(page.getByRole("heading", { name: "Explore golf destinations" })).toBeVisible();

  await page.goto("/map?search=courses");
  await expect(page.getByPlaceholder("Search courses")).toBeVisible();
});
