import { expect, test } from "@playwright/test";
import { courseBackNavigation } from "../src/utils/courseBackNavigation";

test.describe("Course Detail back navigation", () => {
  test("uses the map label and destination when opened from Map", () => {
    expect(courseBackNavigation({ courseBackSource: "map" })).toEqual({
      to: "/map",
      labelKey: "back_to_map",
    });
  });

  test("uses the explore label and destination when opened from Explore", () => {
    expect(courseBackNavigation({ courseBackSource: "explore" })).toEqual({
      to: "/destinations",
      labelKey: "back_to_explore",
    });
  });

  test("uses a neutral, safe fallback for direct and unknown sources", () => {
    expect(courseBackNavigation(undefined)).toEqual({
      to: "/map",
      labelKey: "back",
    });
    expect(courseBackNavigation({ courseBackSource: "unknown" })).toEqual({
      to: "/map",
      labelKey: "back",
    });
  });
});
