export const THEME_KEY = "fairwayd_theme";
export const SHAPE_KEY = "fairwayd_shape";

export const THEMES = [
  "light",
  "dark",
  "ocean",
  "warm",
  "lagoon-light",
  "lagoon",
] as const;
export type ThemeName = (typeof THEMES)[number];

export const SHAPES = ["rounded", "edge"] as const;
export type ShapeName = (typeof SHAPES)[number];

function isTheme(x: unknown): x is ThemeName {
  return typeof x === "string" && (THEMES as readonly string[]).includes(x);
}

function isShape(x: unknown): x is ShapeName {
  return typeof x === "string" && (SHAPES as readonly string[]).includes(x);
}

function normalizeTheme(value: unknown): ThemeName | null {
  if (value === "contrast") return "dark";
  if (value === "forest") return "lagoon";
  if (value === "lagoon-edge") return "lagoon";
  return isTheme(value) ? value : null;
}

function readSavedTheme(): ThemeName | null {
  const saved = localStorage.getItem(THEME_KEY);
  const normalized = normalizeTheme(saved);

  if (saved === "lagoon-edge") {
    localStorage.setItem(SHAPE_KEY, "edge");
  }

  if (typeof saved === "string" && normalized && saved !== normalized) {
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
    if (dom !== normalizedDomTheme) applyTheme(normalizedDomTheme);
    return normalizedDomTheme;
  }

  if (typeof localStorage !== "undefined") {
    const saved = readSavedTheme();
    if (saved) return saved;
  }

  return getInitialTheme();
}

export function getInitialShape(): ShapeName {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(SHAPE_KEY);
    if (isShape(saved)) return saved;
  }
  return "rounded";
}

export function applyTheme(theme: ThemeName) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_KEY, theme);
  }
}

export function applyShape(shape: ShapeName) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-shape", shape);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SHAPE_KEY, shape);
  }
}

export function setTheme(theme: ThemeName) {
  applyTheme(theme);
}

export function setShape(shape: ShapeName) {
  applyShape(shape);
}

export function toggleTheme(current?: ThemeName): ThemeName {
  const cur = current ?? getCurrentTheme();
  const idx = THEMES.indexOf(cur);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  return next;
}
