// web/src/api/client.ts
import { API_BASE } from "./base";

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

export function friendlyApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Your session has expired. Please login again.";
    }

    if (error.status >= 500) {
      return "Fairwayd is temporarily unavailable. Please try again shortly.";
    }

    return error.message || fallback;
  }

  if (error instanceof TypeError) {
    return "Network connection failed. Please check your connection and try again.";
  }

  if (error instanceof Error) {
    if (/^HTTP\s+\d{3}/i.test(error.message)) {
      if (/^HTTP\s+(401|403)/i.test(error.message)) {
        return "Your session has expired. Please login again.";
      }
      if (/^HTTP\s+5\d\d/i.test(error.message)) {
        return "Fairwayd is temporarily unavailable. Please try again shortly.";
      }
      return fallback;
    }

    return error.message || fallback;
  }

  return fallback;
}

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  opts?: {
    token?: string | null;
    body?: any;
    query?: Record<string, string | number | boolean | undefined | null>;
    headers?: Record<string, string>; // optional extra headers
  },
): Promise<T> {
  const url = new URL(`${API_BASE}${normalizePath(path)}`);

  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers ?? {}),
  };

  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  }).catch((error) => {
    throw new ApiError(
      "Network connection failed. Please check your connection and try again.",
      0,
      { cause: error },
    );
  });

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    let msg = `${method} ${path} failed (${res.status})`;
    const serverMsg = data?.message;
    if (serverMsg) {
      msg =
        typeof serverMsg === "string" ? serverMsg : JSON.stringify(serverMsg);
    }
    throw new ApiError(msg, res.status, data);
  }

  // allow empty body responses
  const text = await res.text();
  if (!text) return undefined as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // If server returns non-JSON text (rare), return as-is
    return text as unknown as T;
  }
}

// Convenience helpers
export const apiGet = <T>(
  path: string,
  opts?: Parameters<typeof apiRequest<T>>[2],
) => apiRequest<T>("GET", path, opts);

export const apiPost = <T>(
  path: string,
  opts?: Parameters<typeof apiRequest<T>>[2],
) => apiRequest<T>("POST", path, opts);

export const apiPut = <T>(
  path: string,
  opts?: Parameters<typeof apiRequest<T>>[2],
) => apiRequest<T>("PUT", path, opts);

export const apiPatch = <T>(
  path: string,
  opts?: Parameters<typeof apiRequest<T>>[2],
) => apiRequest<T>("PATCH", path, opts);

export const apiDelete = <T>(
  path: string,
  opts?: Parameters<typeof apiRequest<T>>[2],
) => apiRequest<T>("DELETE", path, opts);
