// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  opts?: {
    token?: string | null;
    body?: any;
    query?: Record<string, string | number | boolean | undefined | null>;
  }
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);

  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    let msg = `${method} ${path} failed (${res.status})`;
    const serverMsg = data?.message;
    if (serverMsg) msg = typeof serverMsg === "string" ? serverMsg : JSON.stringify(serverMsg);
    throw new ApiError(msg, res.status, data);
  }

  // allow empty body responses
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// Convenience helpers
export const apiGet = <T>(path: string, opts?: Parameters<typeof apiRequest<T>>[2]) =>
  apiRequest<T>("GET", path, opts);

export const apiPost = <T>(path: string, opts?: Parameters<typeof apiRequest<T>>[2]) =>
  apiRequest<T>("POST", path, opts);
