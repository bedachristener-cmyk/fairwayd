export const POST_LOGIN_NEXT_KEY = "fairwayd_post_login_next";

export function validPostLoginNext(next: string | null | undefined) {
  if (!next) return null;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed === "/" || trimmed.startsWith("/auth/")) return null;

  return trimmed;
}

export function consumeStoredPostLoginNext() {
  const next = window.localStorage.getItem(POST_LOGIN_NEXT_KEY);
  if (next) window.localStorage.removeItem(POST_LOGIN_NEXT_KEY);
  return validPostLoginNext(next);
}
