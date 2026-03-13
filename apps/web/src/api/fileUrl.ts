import { API_BASE } from "./base";

// API_BASE ist z.B. http://localhost:3000/api
// Für Files brauchen wir http://localhost:3000
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export function fileUrl(u?: string | null) {
  if (!u) return "";

  // local preview blobs
  if (u.startsWith("blob:")) return u;

  // already absolute (R2/CDN/etc.)
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return u;
  }

  // legacy relative uploads served by API origin
  // e.g. /uploads/...
  if (u.startsWith("/uploads/")) {
    return `${API_ORIGIN}${u}`;
  }

  // fallback: return as-is
  return u;
}
