import { expect, test, type Page } from "@playwright/test";
import { mockFairwaydApi, signInForSmokeTest } from "./mock-api";

test.beforeEach(async ({ page }) => {
  await mockFairwaydApi(page);
});

async function selectedButtonColors(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true }).evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
    };
  });
}

test("profile setup selected controls stay readable in dark and contrast", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "en");
    window.localStorage.setItem("fairwayd_theme", "dark");
  });

  await page.goto("/onboarding/profile");
  await expect(page.getByText("Basic profile")).toBeVisible();

  const darkDe = await selectedButtonColors(page, "EN");
  expect(darkDe.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(darkDe.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

  await page.getByRole("button", { name: "Contrast", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "contrast");

  const contrastTheme = await selectedButtonColors(page, "Contrast");
  expect(contrastTheme.color).toBe("rgb(0, 0, 0)");
  expect(contrastTheme.backgroundColor).toBe("rgb(255, 255, 255)");
});

test("German language persists and localizes profile setup and mobile navigation", async ({ page }) => {
  await signInForSmokeTest(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
    window.localStorage.setItem("fairwayd_theme", "dark");
  });

  await page.goto("/onboarding/profile");
  await expect(page.getByText("Basisprofil")).toBeVisible();
  await expect(page.getByText("Profilsichtbarkeit")).toBeVisible();
  await expect(page.getByText("Golfprofil")).toBeVisible();

  await page.reload();
  await expect(page.evaluate(() => window.localStorage.getItem("fairwayd_lang"))).resolves.toBe("de");
  await expect(page.getByText("Basisprofil")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/feed");
  await expect(page.getByRole("button", { name: /Reisen/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ich|Profil/ })).toBeVisible();
});

test("German auth login and register UI uses localized strings", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bei Fairwayd einloggen" })).toBeVisible();
  await expect(page.getByPlaceholder("Passwort")).toBeVisible();
  await expect(page.getByText("Angemeldet bleiben")).toBeVisible();
  await expect(page.getByRole("button", { name: "Einloggen" })).toBeVisible();

  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page.getByRole("heading", { name: "Fairwayd-Konto erstellen" })).toBeVisible();
  await expect(page.getByText("Registriere dich bei Fairwayd mit E-Mail und Passwort.")).toBeVisible();
  await expect(page.getByPlaceholder("Name")).toBeVisible();
  await expect(page.getByPlaceholder("Passwort wiederholen")).toBeVisible();
  await expect(page.getByText("Ich akzeptiere die")).toBeVisible();
  await expect(page.getByRole("button", { name: "Konto registrieren" })).toBeVisible();
});

test("German auth forgot and reset flow uses localized strings", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });
  await page.route("**/auth/forgot-password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Passwort vergessen?" }).click();
  await expect(page.getByRole("heading", { name: "Passwort zuruecksetzen" })).toBeVisible();
  await expect(page.getByText("Gib deine E-Mail ein. Falls das Konto existiert, senden wir dir einen Reset-Code.")).toBeVisible();

  await page.getByPlaceholder("you@example.com").fill("beda@example.com");
  await page.getByRole("button", { name: "Reset-Code senden" }).click();
  await expect(page.getByText("Falls ein Konto fuer diese E-Mail existiert, haben wir einen Reset-Code gesendet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reset-Code eingeben" })).toBeVisible();

  await page.getByPlaceholder("Reset-Code").fill("123456");
  await page.getByPlaceholder("Neues Passwort", { exact: true }).fill("password123");
  await page.getByPlaceholder("Neues Passwort bestaetigen").fill("different123");
  await page.getByRole("button", { name: "Passwort zuruecksetzen" }).click();
  await expect(page.getByText("Die Passwoerter stimmen nicht ueberein.")).toBeVisible();
});

test("German magic-link callback uses localized strings", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("fairwayd_lang", "de");
  });

  await page.goto("/auth/email/callback");
  await expect(page.getByText("E-Mail-Login")).toBeVisible();
  await expect(page.getByText("Diesem Login-Link fehlt ein Token.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zurueck zum Login" })).toBeVisible();
});
