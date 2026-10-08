import { expect, test, type Page, type Route } from "@playwright/test";
import { signInForSmokeTest } from "./mock-api";
import { mockUser } from "./smoke-data";

const ownerMember = {
  id: "member-owner",
  tripId: "trip-1",
  userId: "e2e-user",
  displayName: "E2E User",
  isGuest: false,
  role: "OWNER",
  user: mockUser,
};

const guestMember = {
  id: "member-guest",
  tripId: "trip-1",
  userId: null,
  displayName: "Guest Player",
  isGuest: true,
  role: "MEMBER",
  user: null,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockTripApi(page: Page) {
  let document = {
    id: "document-1",
    tripId: "trip-1",
    title: "Booking PDF",
    note: null,
    category: "FLIGHT",
    visibility: "SHARED",
    fileName: "booking.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1200,
    uploadedByUserId: "e2e-user",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    downloadPath: "/trips/trip-1/documents/document-1/file",
    uploadedBy: mockUser,
    itemLinks: [],
    visibilityMembers: [] as Array<{ tripMemberId: string }>,
  };
  const visibilityUpdates: Array<{
    visibility: string;
    visibleToMemberIds?: string[];
  }> = [];

  const trip = () => ({
    id: "trip-1",
    title: "Autumn golf trip",
    destination: "Zurich",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
    baseCurrency: "CHF",
    members: [ownerMember, guestMember],
    documents: [document],
    items: [
      {
        id: "flight-1",
        tripId: "trip-1",
        type: "flight",
        title: "Flight LX123",
        startDate: "2026-10-10",
        startTime: "09:00",
        endTime: "10:15",
        visibility: "GROUP",
        createdByUserId: "e2e-user",
        participants: [],
        visibilityMembers: [],
        documentLinks: [],
        costs: [],
      },
    ],
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (!path.startsWith("/api/")) return route.continue();

    if (path === "/api/users/me") return json(route, mockUser);
    if (path === "/api/trips/trip-1") return json(route, trip());
    if (path === "/api/trips/trip-1/documents") return json(route, [document]);
    if (path === "/api/trips/trip-1/activity") return json(route, []);
    if (path === "/api/trips/trip-1/my-costs" || path === "/api/trips/trip-1/organizer-costs") {
      return json(route, {}, 500);
    }
    if (path === "/api/trips/trip-1/documents/document-1" && request.method() === "PATCH") {
      const update = request.postDataJSON() as {
        visibility: string;
        visibleToMemberIds?: string[];
      };
      visibilityUpdates.push(update);
      document = {
        ...document,
        visibility: update.visibility,
        visibilityMembers: (update.visibleToMemberIds ?? []).map((tripMemberId) => ({ tripMemberId })),
      };
      return json(route, document);
    }

    return json(route, []);
  });

  return visibilityUpdates;
}

test.beforeEach(async ({ page }) => {
  await signInForSmokeTest(page);
});

test("document visibility selector persists selected members", async ({ page }) => {
  const visibilityUpdates = await mockTripApi(page);
  await page.goto("/trips/trip-1");

  await page.getByRole("button", { name: /Documents/i }).click();
  const visibility = page.getByRole("combobox", {
    name: "Document visibility: Booking PDF",
  });
  await expect(visibility).toHaveValue("SHARED");

  await visibility.selectOption("SELECTED");
  await expect(page.getByLabel("Guest Player")).toBeVisible();
  await page.getByLabel("Guest Player").click();

  await expect
    .poll(() => visibilityUpdates.at(-1))
    .toEqual({
      visibility: "SELECTED",
      visibleToMemberIds: ["member-owner", "member-guest"],
    });
  await expect(visibility).toHaveValue("SELECTED");
});

test("flight cost actions use the flight blue accent", async ({ page }) => {
  await mockTripApi(page);
  await page.goto("/trips/trip-1");
  await page.getByRole("button", { name: /Timeline/i }).click();
  await page.getByRole("button", { name: "Edit" }).click();

  const addCost = page.getByRole("button", { name: "+ Add cost" }).first();
  await expect(addCost).toBeVisible();
  await expect(addCost).toHaveCSS("color", "rgb(47, 145, 216)");
  await addCost.click();

  const saveCosts = page.getByRole("button", { name: "Save costs" }).first();
  await expect(saveCosts).toHaveCSS("background-color", "rgb(47, 145, 216)");
});
