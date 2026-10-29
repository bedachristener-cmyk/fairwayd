import { test, expect } from "@playwright/test";
const translations = {
  de: { terms: "AGB & Community-Regeln", privacy: "Datenschutzerklärung", draft: "Neuer Entwurf", current: "Bisherige Fassung v1", language: "Sprache", contents: "Inhaltsverzeichnis" },
  fr: { terms: "Conditions & règles communautaires", privacy: "Protection des données", draft: "Nouveau projet", current: "Version antérieure v1", language: "Langue", contents: "Sommaire" },
  it: { terms: "Condizioni e regole della comunità", privacy: "Protezione dei dati", draft: "Nuova bozza", current: "Versione precedente v1", language: "Lingua", contents: "Indice" },
  en: { terms: "Terms & community rules", privacy: "Privacy policy", draft: "New draft", current: "Previous version v1", language: "Language", contents: "Contents" },
};
test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.port === "3000" || url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.pathname.endsWith("/admin-status") ? { isAdmin: false } : []) });
    if (url.hostname.includes("openstreetmap") || url.hostname.includes("arcgisonline")) return route.abort();
    return route.continue();
  });
});
for (const width of [390, 1280]) {
  for (const [language, copy] of Object.entries(translations)) {
    test(`public legal documents and separate draft in ${language}, ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const consentRequests: string[] = [];
      page.on("request", request => { if (/accept-terms/.test(request.url())) consentRequests.push(request.method()); });
      await page.goto(`/terms?lang=${language}`);
      await expect(page.getByRole("heading", { level: 1, name: copy.terms })).toBeVisible();
      await expect(page.locator("article section")).toHaveCount(7);
      await expect(page.getByRole("button", { name: copy.current, exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: copy.draft, exact: true }).click();
      await expect(page.locator("article section")).toHaveCount(14);
      await expect(page.locator("aside")).toContainText(language === "de" ? "noch nicht in Kraft" : language === "fr" ? "pas encore en vigueur" : language === "it" ? "non ancora in vigore" : "not yet in force");
      await expect(page.locator("article")).toContainText("CHE-310.823.737");
      await page.locator("summary").click();
      await page.locator("details a").last().click();
      await expect(page).toHaveURL(/#legal-section-13$/);
      await page.locator("nav a[href^='/privacy']").click();
      await expect(page.getByRole("heading", { level: 1, name: copy.privacy })).toBeVisible();
      await expect(page.locator("article section")).toHaveCount(10);
      await expect(page.locator("article")).toContainText("Porkbun");
      await expect(page.locator("article")).toContainText("OpenAI");
      await expect(page.getByRole("combobox", { name: copy.language })).toHaveValue(language);
      await page.reload();
      await expect(page.locator("article section")).toHaveCount(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/legal-${language}-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: copy.current, exact: true }).click();
      await expect(page.locator("article section")).toHaveCount(8);
      await page.getByRole("combobox", { name: copy.language }).selectOption(language === "en" ? "de" : "en");
      await expect(page.locator("main")).toHaveAttribute("lang", language === "en" ? "de" : "en");
      await expect(page.locator("article section")).toHaveCount(8);
      expect(consentRequests).toEqual([]);
    });
  }
  test(`guest can reach legal texts from ${width === 390 ? "hamburger" : "desktop sidebar"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("fairwayd_lang", "en"));
    await page.goto("/map");
    if (width === 390) await page.getByRole("button", { name: "Open main menu", exact: true }).click();
    await page.getByRole("button", { name: translations.en.terms, exact: true }).click();
    await expect(page).toHaveURL(/\/terms\?lang=en$/);
    await expect(page.locator("article section")).toHaveCount(7);
    await page.goto("/");
    await page.getByRole("link", { name: translations.en.privacy, exact: true }).click();
    await expect(page).toHaveURL(/\/privacy\?lang=en$/);
    await expect(page.locator("article section")).toHaveCount(8);
  });
}
test("unsupported legal language falls back to English without sign-in", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fairwayd_lang", "th"));
  await page.goto("/privacy?lang=th");
  await expect(page.locator("main")).toHaveAttribute("lang", "en");
  await expect(page.locator("article section")).toHaveCount(8);
});
