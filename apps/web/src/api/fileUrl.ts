import { API_BASE } from "./base";

// API_BASE ist z.B. http://localhost:3000/api
// Für Files brauchen wir http://localhost:3000
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export function fileUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("blob:") || u.startsWith("http")) return u;
  return `${API_ORIGIN}${u}`;
}
