export const THEME_KEY = "fairwayd_theme";

// Muss zu deinen CSS-Themes passen: html[data-theme="..."]
export const THEMES = [
  "dark",
  "light",
  "forest",
  "ocean",
  "warm",
] as const;
export type ThemeName = (typeof THEMES)[number];

function isTheme(x: unknown): x is ThemeName {
  return typeof x === "string" && (THEMES as readonly string[]).includes(x);
}

function normalizeTheme(value: unknown): ThemeName | null {
  if (value === "contrast") return "dark";
  return isTheme(value) ? value : null;
}

function readSavedTheme(): ThemeName | null {
  const saved = localStorage.getItem(THEME_KEY);
  const normalized = normalizeTheme(saved);

  if (saved === "contrast" && normalized) {
    localStorage.setItem(THEME_KEY, normalized);
  }

  return normalized;
}

export function getInitialTheme(): ThemeName {
  const saved = readSavedTheme();
  if (saved) return saved;

  const prefersDark =
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export function getCurrentTheme(): ThemeName {
  const dom =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme")
      : null;

  const normalizedDomTheme = normalizeTheme(dom);
  if (normalizedDomTheme) {
    if (dom === "contrast") applyTheme(normalizedDomTheme);
    return normalizedDomTheme;
  }

  if (typeof localStorage !== "undefined") {
    const saved = readSavedTheme();
    if (saved) return saved;
  }

  return getInitialTheme();
}

export function applyTheme(theme: ThemeName) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_KEY, theme);
  }
}

export function setTheme(theme: ThemeName) {
  applyTheme(theme);
}

export function toggleTheme(current?: ThemeName): ThemeName {
  const cur = current ?? getCurrentTheme();
  const idx = THEMES.indexOf(cur);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  return next;
}
