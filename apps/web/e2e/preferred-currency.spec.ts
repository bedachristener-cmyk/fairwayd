import { expect, test, type Route } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";
import { mockUser } from "./smoke-data";

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("preferred currency defaults a new trip and remains overridable", async ({ page }) => {
  await mockFairwaydApi(page);
  await signInForSmokeTest(page);

  const user = { ...mockUser, preferredCurrency: "EUR" };
  let createdTripBody: Record<string, unknown> | null = null;

  await page.route("**/api/users/me", (route) => json(route, user));
  await page.route("**/api/trips", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    createdTripBody = route.request().postDataJSON();
    return json(route, { id: "trip-new" });
  });

  await page.goto("/trips/new");
  const currency = page.getByLabel("Base currency");
  await expect(currency).toHaveValue("EUR");

  await currency.selectOption("THB");
  await page.getByLabel("Title").fill("Thailand golf trip");
  await page.locator("form").getByRole("button", { name: "Create", exact: true }).click();

  await expect.poll(() => createdTripBody?.baseCurrency).toBe("THB");
});

test("profile preferred-currency picker persists the selected value", async ({ page }) => {
  await mockFairwaydApi(page);
  await signInForSmokeTest(page);

  const user = { ...mockUser, preferredCurrency: "EUR" };
  let savedCurrency = "";

  await page.route("**/api/users/me", (route) => json(route, user));
  await page.route("**/api/users/e2e", (route) => json(route, user));
  await page.route("**/api/users/me/preferences", async (route) => {
    savedCurrency = route.request().postDataJSON().preferredCurrency;
    return json(route, { ...user, preferredCurrency: savedCurrency });
  });

  await page.goto("/profile");
  await page.getByRole("button", { name: /Preferred currency/ }).click();
  await page.getByRole("button", { name: "USD", exact: true }).click();

  await expect.poll(() => savedCurrency).toBe("USD");
});
