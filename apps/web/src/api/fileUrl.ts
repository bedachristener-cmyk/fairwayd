import { API_BASE } from "./base";

// API_BASE ist z.B. http://localhost:3000/api
// Für Files brauchen wir http://localhost:3000
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

function withCacheBust(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ts=${Date.now()}`;
}

export function fileUrl(u?: string | null) {
  if (!u) return "";

  // local preview blobs
  if (u.startsWith("blob:")) return u;

  // already absolute (R2/CDN/etc.)
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return withCacheBust(u);
  }

  // legacy relative uploads served by API origin
  // e.g. /uploads/...
  if (u.startsWith("/uploads/")) {
    return withCacheBust(`${API_ORIGIN}${u}`);
  }

  // fallback: return as-is
  return u;
}
