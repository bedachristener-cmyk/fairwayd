const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function requireToken(token: string | null | undefined): string {
  const t = (token ?? "").trim();
  if (!t) throw new Error("Missing auth token. Please login again.");
  return t;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  return text?.trim() ? text.trim() : `${res.status} ${res.statusText}`;
}

export async function getCourseFollowing(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/following`, {
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { following: boolean };
}

export async function followCourse(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "POST",
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: boolean };
}

export async function unfollowCourse(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "DELETE",
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: boolean };
}
