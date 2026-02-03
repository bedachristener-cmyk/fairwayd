const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Primary storage key (we standardize on this)
export const STORAGE_TOKEN_KEY = "fairwayd_token";

// Backwards compatible keys (in case older code used other names)
const FALLBACK_TOKEN_KEYS = ["token", "auth_token", "fairwayd.jwt"];

export function getToken() {
  const direct = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (direct) return direct;

  for (const k of FALLBACK_TOKEN_KEYS) {
    const t = localStorage.getItem(k);
    if (t) return t;
  }
  return null;
}

export function setToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    return;
  }
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
}

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function throwNiceError(res: Response) {
  const txt = await res.text().catch(() => "");
  throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...authHeaders(token) },
  });

  if (!res.ok) await throwNiceError(res);
  return res.json();
}

export async function apiPostJson<T>(path: string, body: any): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) await throwNiceError(res);
  return res.json();
}

export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
    },
    body: form,
  });

  if (!res.ok) await throwNiceError(res);
  return res.json();
}
