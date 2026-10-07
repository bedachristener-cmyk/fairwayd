export type CourseBackSource = "map" | "explore";

type CourseNavigationState = {
  courseBackSource?: unknown;
};

export function courseBackNavigation(state: unknown): {
  to: string;
  labelKey: "back_to_map" | "back_to_explore" | "back";
} {
  const source = (state as CourseNavigationState | null)?.courseBackSource;

  if (source === "explore") {
    return { to: "/destinations", labelKey: "back_to_explore" };
  }

  if (source === "map") {
    return { to: "/map", labelKey: "back_to_map" };
  }

  return { to: "/map", labelKey: "back" };
}
