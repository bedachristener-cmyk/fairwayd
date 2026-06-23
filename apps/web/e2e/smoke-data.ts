import { createRequire } from "node:module";

export type SmokeCourse = {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  holes: number;
  access: string;
  lat: number;
  lon: number;
};

const require = createRequire(import.meta.url);
const fixtureData = require("./fixtures/course-fixtures.json") as {
  mockUser: Record<string, unknown>;
  destinations: Array<{
    id: string;
    code: string;
    name: string;
    slug: string;
    courseCount: number;
    followerCount: number;
    tipsCount: number;
    viewerIsFollowing: boolean;
  }>;
  criticalCoursesByCountry: Record<string, SmokeCourse[]>;
};

export const mockUser = fixtureData.mockUser;
export const destinations = fixtureData.destinations;
export const coursesByCountry = fixtureData.criticalCoursesByCountry;
export const allCourses = Object.values(coursesByCountry).flat();
