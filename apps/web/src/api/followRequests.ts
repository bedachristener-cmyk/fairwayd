import { API_BASE } from "./base";

export type FollowRequestItem = {
  followerId: string;
  followerHandle: string;
  followerName?: string | null;
  followerAvatarUrl?: string | null;
  createdAt?: string;
};

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFollowRequests(token: string | null) {
  const res = await fetch(`${API_BASE}/users/me/follow-requests`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as FollowRequestItem[];
}

export async function acceptFollowRequest(
  token: string | null,
  followerId: string,
) {
  const res = await fetch(
    `${API_BASE}/users/me/follow-requests/${encodeURIComponent(
      followerId,
    )}/accept`,
    { method: "POST", headers: { ...authHeaders(token) } },
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function rejectFollowRequest(
  token: string | null,
  followerId: string,
) {
  const res = await fetch(
    `${API_BASE}/users/me/follow-requests/${encodeURIComponent(
      followerId,
    )}/reject`,
    { method: "POST", headers: { ...authHeaders(token) } },
  );
  if (!res.ok) throw new Error(await res.text());
}
