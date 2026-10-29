export type CourseRatingBreakdown = {
  condition: number;
  layout: number;
  scenery: number;
  value: number;
};

export type CourseRatingSummaryData = {
  overall: number;
  count: number;
  breakdown: CourseRatingBreakdown;
};

const COURSE_RATINGS: Record<string, CourseRatingSummaryData> = {
  // Replace these example IDs with real course IDs that exist in your database
  cmlsfzgue002ibkuwfhemrnda: {
    overall: 4.4,
    count: 128,
    breakdown: {
      condition: 4.0,
      layout: 4.3,
      scenery: 4.5,
      value: 4.7,
    },
  },
  "demo-course-2": {
    overall: 4.1,
    count: 74,
    breakdown: {
      condition: 4.0,
      layout: 4.2,
      scenery: 4.3,
      value: 3.9,
    },
  },
};

export function getCourseRatingSummary(
  courseId?: string | null,
): CourseRatingSummaryData | null {
  if (!courseId) return null;
  return COURSE_RATINGS[courseId] ?? null;
}
