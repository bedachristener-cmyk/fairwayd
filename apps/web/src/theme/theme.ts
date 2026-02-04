export const THEME_KEY = "fairwayd_theme";

// Muss zu deinen CSS-Themes passen: html[data-theme="..."]
export const THEMES = [
  "dark",
  "light",
  "forest",
  "sepia",
  "ocean",
  "sunset",
] as const;
export type ThemeName = (typeof THEMES)[number];

function isTheme(x: any): x is ThemeName {
  return THEMES.includes(x);
}

export function getInitialTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  if (isTheme(saved)) return saved;

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

  if (isTheme(dom)) return dom;

  const saved =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(THEME_KEY)
      : null;
  if (isTheme(saved)) return saved;

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
