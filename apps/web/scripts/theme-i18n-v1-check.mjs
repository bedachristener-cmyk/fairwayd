import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const css = read("src/index.css");
const strings = read("src/i18n/strings.tsx");
const setup = read("src/onboarding/ProfileSetup.tsx");
const profile = read("src/pages/ProfilePage.tsx");
const topRail = read("src/shell/TopRail.tsx");
const bottomTabs = read("src/shell/BottomTabs.tsx");
const loginPanel = read("src/components/LoginPanel.tsx");
const emailLoginCallback = read("src/pages/EmailLoginCallbackPage.tsx");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const expectedLangs = ["en", "de", "fr", "it", "es", "ko", "th"];
const languageOptionCodes = [
  ...strings.matchAll(/\{\s*code:\s*"([a-z]{2})"/g),
].map((match) => match[1]);

assert(
  JSON.stringify(languageOptionCodes) === JSON.stringify(expectedLangs),
  `LANGUAGE_OPTIONS mismatch: ${languageOptionCodes.join(",")}`,
);

const extraStart = strings.indexOf("const EXTRA_STRINGS = {");
const extraKeysByLang = {};
for (let index = 0; index < expectedLangs.length; index += 1) {
  const lang = expectedLangs[index];
  const start = strings.indexOf(`  ${lang}: {`, extraStart);
  const end =
    index + 1 < expectedLangs.length
      ? strings.indexOf(`  ${expectedLangs[index + 1]}: {`, start)
      : strings.indexOf("} as const;", start);
  const block = strings.slice(start, end);
  extraKeysByLang[lang] = [...block.matchAll(/^\s{4}([a-zA-Z0-9_]+):/gm)].map(
    (match) => match[1],
  );
}

const englishExtraKeys = extraKeysByLang.en;
for (const lang of expectedLangs) {
  const missing = englishExtraKeys.filter((key) => !extraKeysByLang[lang].includes(key));
  const extra = extraKeysByLang[lang].filter((key) => !englishExtraKeys.includes(key));
  assert(missing.length === 0, `${lang} missing extra i18n keys: ${missing.join(",")}`);
  assert(extra.length === 0, `${lang} has unexpected extra i18n keys: ${extra.join(",")}`);
}

for (const theme of ["dark", "light", "forest", "ocean", "warm", "contrast"]) {
  const block = css.match(
    new RegExp(`html\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`),
  )?.[1];

  assert(block, `Missing ${theme} theme block`);
  assert(block.includes("--control-selected-bg:"), `${theme} missing selected bg`);
  assert(block.includes("--control-selected-text:"), `${theme} missing selected text`);
  assert(
    block.includes("--control-selected-subtext:"),
    `${theme} missing selected subtext`,
  );
}

const contrastBlock = css.match(
  /html\[data-theme="contrast"\]\s*\{([\s\S]*?)\n\}/,
)?.[1];
assert(contrastBlock?.includes("--fw-pill-active-bg: #ffffff;"), "contrast pill bg not explicit");
assert(contrastBlock?.includes("--fw-pill-active-text: #000000;"), "contrast pill text not explicit");

assert(!setup.includes('color: active ? "var(--bg)"'), "ProfileSetup still uses transparent active text");
assert(!setup.includes('background: active ? "var(--text)"'), "ProfileSetup still uses inverted active bg");
assert(setup.includes("LANGUAGE_OPTIONS.map"), "ProfileSetup does not use shared language options");
assert(profile.includes("LANGUAGE_OPTIONS.map"), "Profile settings does not use shared language options");

for (const key of [
  "basic_profile",
  "profile_privacy",
  "golf_profile",
  "profile_photo",
  "settings_app_appearance_language",
]) {
  assert(setup.includes(`t("${key}")`) || profile.includes(`t("${key}")`), `${key} not wired`);
}

assert(topRail.includes('label: t("trips")'), "TopRail trips label is not localized");
assert(bottomTabs.includes('label={t("trips")}'), "BottomTabs trips label is not localized");

for (const key of [
  "auth_signin_title",
  "auth_register_title",
  "auth_verify_title",
  "auth_forgot_title",
  "auth_reset_title",
  "auth_error_invalid_credentials",
  "auth_error_accept_legal",
  "auth_magic_title",
  "auth_magic_missing_token",
]) {
  assert(englishExtraKeys.includes(key), `${key} missing from auth i18n keys`);
}

for (const literal of [
  ">Sign in to Fairwayd<",
  ">Create your Fairwayd account<",
  ">Verify your email<",
  ">Reset your password<",
  ">Enter reset code<",
  'placeholder="Password"',
  ">Remember me<",
]) {
  assert(!loginPanel.includes(literal), `LoginPanel still contains hard-coded auth UI: ${literal}`);
}

assert(loginPanel.includes('t("auth_signin_title")'), "LoginPanel sign-in title is not localized");
assert(loginPanel.includes('t("auth_error_accept_legal")'), "LoginPanel validation text is not localized");
assert(emailLoginCallback.includes('t("auth_magic_title")'), "Magic-link title is not localized");
assert(emailLoginCallback.includes('t("auth_magic_missing_token")'), "Magic-link error is not localized");

console.log("theme-i18n-v1-check passed");
