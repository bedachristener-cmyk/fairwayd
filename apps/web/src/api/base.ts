function normalizeApiBase(v: string | undefined | null) {
  const s = (v ?? "").trim().replace(/\/+$/, "");
  if (!s) return "http://localhost:3000";
  if (/^https?:\/\//i.test(s)) return s;
  // If someone configured only "fairwayd-xyz.up.railway.app", assume https
  return `https://${s}`;
}

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
