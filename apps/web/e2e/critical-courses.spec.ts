import { expect, test } from "@playwright/test";
import { coursesByCountry, destinations } from "./smoke-data";
import { mockFairwaydApi } from "./mock-api";

const destinationByCode = Object.fromEntries(
  destinations.map((destination) => [destination.code, destination]),
);

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

for (const [countryCode, courses] of Object.entries(coursesByCountry)) {
  const destination = destinationByCode[countryCode];

  test(`${destination.name} destination shows V1 critical courses`, async ({
    page,
  }) => {
    await page.goto(`/destinations/${destination.slug}`);

    await expect(page.getByText(destination.name).first()).toBeVisible();
    await page.getByRole("button", { name: "See all courses" }).click();

    for (const course of courses) {
      await expect(page.getByText(course.name).first()).toBeVisible();
    }
  });
}
