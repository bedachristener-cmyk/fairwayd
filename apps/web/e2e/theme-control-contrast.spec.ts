import { expect, test, type Page } from "@playwright/test";

const THEMES = ["dark", "light", "forest", "ocean", "warm", "contrast"] as const;

type Rgba = { r: number; g: number; b: number; a: number };

function luminance({ r, g, b }: Rgba) {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground: Rgba, background: Rgba) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function semanticControlColors(page: Page) {
  return page.locator("[data-contrast-control]").evaluateAll((elements) => {
    function rgba(value: string) {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return {
        r: channels[0] ?? 0,
        g: channels[1] ?? 0,
        b: channels[2] ?? 0,
        a: channels[3] ?? 1,
      };
    }

    function blend(
      foreground: { r: number; g: number; b: number; a: number },
      background: { r: number; g: number; b: number; a: number },
    ) {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    }

    function effectiveBackground(element: Element) {
      let background = { r: 255, g: 255, b: 255, a: 1 };
      const ancestors: Element[] = [];
      for (let current: Element | null = element; current; current = current.parentElement) {
        ancestors.push(current);
      }
      for (const current of ancestors.reverse()) {
        background = blend(rgba(getComputedStyle(current).backgroundColor), background);
      }
      return background;
    }

    return elements.map((element) => {
      const background = effectiveBackground(element);
      const foreground = blend(rgba(getComputedStyle(element).color), background);
      return {
        name: element.getAttribute("data-contrast-control") ?? "unknown",
        foreground,
        background,
      };
    });
  });
}

test("semantic control states retain readable foreground contrast in every theme", async ({ page }) => {
  await page.goto("/");

  await page.locator("body").evaluate((body) => {
    body.innerHTML = `
      <main style="background: var(--card); padding: 24px">
        <button class="fw-pill fw-pill--inactive" data-contrast-control="inactive">Inactive</button>
        <span class="fw-pill fw-pill--info" data-contrast-control="info">Information</span>
        <button class="fw-pill fw-pill--active" data-contrast-control="active">Active</button>
        <button class="fw-pill fw-pill--action" data-contrast-control="action">Action</button>
        <button class="fw-pill fw-pill--soft-cta" data-contrast-control="soft-cta">Soft CTA</button>
        <button class="fw-pill fw-pill--cta" data-contrast-control="cta">CTA</button>
        <button class="fw-button-primary" data-contrast-control="primary">Primary</button>
        <button class="fw-pill fw-pill--cta" data-contrast-control="disabled-pill" disabled>Disabled</button>
        <button class="fw-button-primary" data-contrast-control="disabled-primary" disabled>Disabled</button>
        <div
          data-contrast-control="selected"
          style="background: var(--control-selected-bg); color: var(--control-selected-text); padding: 8px"
        >
          Selected
          <span data-contrast-control="selected-subtext" style="color: var(--control-selected-subtext)">
            Selected detail
          </span>
        </div>
      </main>
    `;
  });

  for (const theme of THEMES) {
    await page.locator("html").evaluate((html, nextTheme) => {
      html.setAttribute("data-theme", nextTheme);
    }, theme);

    const controls = await semanticControlColors(page);
    for (const control of controls) {
      const ratio = contrastRatio(control.foreground, control.background);
      expect(
        ratio,
        `${theme} ${control.name} foreground/background contrast was ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("the no-attribute fallback uses the readable dark control palette", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").evaluate((body) => {
    document.documentElement.removeAttribute("data-theme");
    body.innerHTML = `
      <main style="background: var(--card); padding: 24px">
        <span class="fw-pill" data-contrast-control="fallback-inactive">Inactive</span>
        <button class="fw-pill fw-pill--cta" data-contrast-control="fallback-cta">CTA</button>
      </main>
    `;
  });

  const controls = await semanticControlColors(page);
  for (const control of controls) {
    const ratio = contrastRatio(control.foreground, control.background);
    expect(
      ratio,
      `${control.name} foreground/background contrast was ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
