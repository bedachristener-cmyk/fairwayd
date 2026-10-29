export async function createPost(token: string, data: {
  courseId: string;
  content: string;
  visibility?: "FOLLOWERS" | "PUBLIC";
}) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to create post");
  }

  return res.json();
}
