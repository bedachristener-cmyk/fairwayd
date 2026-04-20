import { API_BASE } from "../api/base";

export type RatingPayload = {
  overall: number;
  condition?: number | null;
  layout?: number | null;
  scenery?: number | null;
  value?: number | null;
};

export type RatingSummary = {
  overall: number;
  count: number;
  breakdown: {
    condition: number;
    layout: number;
    scenery: number;
    value: number;
  };
};

export type MyRating = {
  overall: number;
  condition?: number | null;
  layout?: number | null;
  scenery?: number | null;
  value?: number | null;
};

export async function saveRating(
  courseId: string,
  token: string,
  data: RatingPayload,
) {
  const res = await fetch(`${API_BASE}/ratings/${courseId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to save rating");
  }

  return res.json();
}

export async function getMyRating(
  courseId: string,
  token: string,
): Promise<MyRating | null> {
  try {
    const res = await fetch(`${API_BASE}/ratings/me/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("getMyRating failed", {
        courseId,
        status: res.status,
        body: text,
      });
      return null;
    }

    if (!text) {
      console.error("getMyRating empty body", {
        courseId,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const data = JSON.parse(text);

    if (!data || typeof data.overall !== "number") {
      console.error("getMyRating invalid payload", { courseId, data });
      return null;
    }

    return data;
  } catch (err) {
    console.error("getMyRating crashed", { courseId, err });
    return null;
  }
}

export async function getRatingSummary(
  courseId: string,
): Promise<RatingSummary> {
  const emptySummary: RatingSummary = {
    overall: 0,
    count: 0,
    breakdown: {
      condition: 0,
      layout: 0,
      scenery: 0,
      value: 0,
    },
  };

  try {
    const res = await fetch(`${API_BASE}/ratings/${courseId}`);

    if (!res.ok) {
      return emptySummary;
    }

    const text = await res.text();

    if (!text) {
      return emptySummary;
    }

    const data = JSON.parse(text);

    if (!data) {
      return emptySummary;
    }

    return {
      overall:
        typeof data.overall === "number" ? data.overall : emptySummary.overall,
      count: typeof data.count === "number" ? data.count : emptySummary.count,
      breakdown: {
        condition:
          typeof data?.breakdown?.condition === "number"
            ? data.breakdown.condition
            : emptySummary.breakdown.condition,
        layout:
          typeof data?.breakdown?.layout === "number"
            ? data.breakdown.layout
            : emptySummary.breakdown.layout,
        scenery:
          typeof data?.breakdown?.scenery === "number"
            ? data.breakdown.scenery
            : emptySummary.breakdown.scenery,
        value:
          typeof data?.breakdown?.value === "number"
            ? data.breakdown.value
            : emptySummary.breakdown.value,
      },
    };
  } catch {
    return emptySummary;
  }
}
