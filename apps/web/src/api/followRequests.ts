import { API_BASE } from "./base";
import { friendlyApiErrorMessage } from "./client";

export type FollowRequestItem = {
  followerId: string;
  followerHandle: string;
  followerName?: string | null;
  followerAvatarUrl?: string | null;
  homeGolfClub?: string | null;
  handicap?: number | string | null;
  favoriteGolfDestination?: string | null;
  golfSlogan?: string | null;
  bio?: string | null;
  createdAt?: string;
};

function requireToken(token: string | null | undefined): string {
  const t = (token ?? "").trim();
  if (!t) {
    throw new Error("Missing auth token. Please login again.");
  }
  return t;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  if (res.status === 401 || res.status === 403) {
    return "Your session has expired. Please login again.";
  }
  if (res.status >= 500) {
    return "Follow requests are temporarily unavailable. Please try again shortly.";
  }
  const msg = text?.trim() ? text.trim() : `${res.status} ${res.statusText}`;
  return msg.length > 180 ? "Could not update follow requests." : msg;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new Error(friendlyApiErrorMessage(error, "Network connection failed."));
  }
}

/** GET /users/me/follow-requests */
export async function fetchFollowRequests(
  token: string | null | undefined,
  opts?: { signal?: AbortSignal },
) {
  const t = requireToken(token);

  const res = await safeFetch(`${API_BASE}/users/me/follow-requests`, {
    headers: authHeaders(t),
    signal: opts?.signal,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Unauthorized. Please login again.");
  }

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as FollowRequestItem[];
}

/** POST /users/me/follow-requests/:followerId/accept */
export async function acceptFollowRequest(
  token: string | null | undefined,
  followerId: string,
) {
  const t = requireToken(token);

  const res = await safeFetch(
    `${API_BASE}/users/me/follow-requests/${encodeURIComponent(followerId)}/accept`,
    { method: "POST", headers: authHeaders(t) },
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error("Unauthorized. Please login again.");
  }

  if (!res.ok) {
    throw new Error(await readError(res));
  }
}

/** POST /users/me/follow-requests/:followerId/reject */
export async function rejectFollowRequest(
  token: string | null | undefined,
  followerId: string,
) {
  const t = requireToken(token);

  const res = await safeFetch(
    `${API_BASE}/users/me/follow-requests/${encodeURIComponent(followerId)}/reject`,
    { method: "POST", headers: authHeaders(t) },
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error("Unauthorized. Please login again.");
  }

  if (!res.ok) {
    throw new Error(await readError(res));
  }
}
