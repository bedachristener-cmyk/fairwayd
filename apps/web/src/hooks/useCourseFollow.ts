import { useEffect, useState } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

export function useCourseFollow(courseId: string | null) {
  const { token } = useAuth();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!courseId || !token) {
        setIsFollowing(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/courses/${courseId}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setIsFollowing(!!data?.following);
      } catch {
        // ignore
      }
    };

    run();
  }, [courseId, token]);

  const toggleFollow = async () => {
    if (!courseId || !token || followBusy) return;

    const prev = isFollowing;
    const next = !prev;

    setIsFollowing(next);
    setFollowBusy(true);

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setIsFollowing(prev);
      }
    } catch {
      setIsFollowing(prev);
    } finally {
      setFollowBusy(false);
    }
  };

  return {
    token,
    isFollowing,
    followBusy,
    toggleFollow,
  };
}
