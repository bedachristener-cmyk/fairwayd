import { API_BASE } from "./base";

// API_BASE ist z.B. http://localhost:3000/api
// Für Files brauchen wir http://localhost:3000
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export function fileUrl(u?: string | null) {
  if (!u) return "";
  const value = u.trim();
  if (!value) return "";

  // local preview blobs
  if (value.startsWith("blob:")) return value;

  // already absolute (R2/CDN/etc.)
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // protocol-relative CDN URL
  if (value.startsWith("//")) {
    return `${window.location.protocol}${value}`;
  }

  // legacy relative uploads served by API origin
  // e.g. /uploads/...
  if (value.startsWith("/uploads/")) {
    return `${API_ORIGIN}${value}`;
  }

  // R2/CDN URLs can be persisted without protocol in some environments.
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\//i.test(value)) {
    return `https://${value}`;
  }

  // fallback: return as-is
  return value;
}
