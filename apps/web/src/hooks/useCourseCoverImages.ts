import { useEffect, useState } from "react";
import { API_BASE } from "../api/base";

export type CourseCover = { image: { id: string; url: string } | null; isSelected: boolean };

export function useCourseCoverImages(ids: string[]) {
  const key = Array.from(new Set(ids.filter(Boolean))).sort().join("|");
  const [covers, setCovers] = useState<Record<string, CourseCover>>({});
  useEffect(() => {
    const controller = new AbortController();
    const courseIds = key ? key.split("|") : [];
    setCovers({});
    void Promise.all(courseIds.map(async (id) => {
      try {
        const response = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}/cover-image`, { signal: controller.signal });
        if (!response.ok) return null;
        return [id, await response.json() as CourseCover] as const;
      } catch { return null; }
    })).then((results) => {
      if (!controller.signal.aborted) setCovers(Object.fromEntries(results.filter((r): r is readonly [string, CourseCover] => r !== null)));
    });
    return () => controller.abort();
  }, [key]);
  return [covers, setCovers] as const;
}
