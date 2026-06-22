export const mockUser = {
  id: "e2e-user",
  email: "e2e@example.com",
  handle: "e2e",
  name: "E2E User",
  avatarUrl: "/logo.png",
  privacy: "PUBLIC",
  termsAcceptedAt: "2026-01-01T00:00:00.000Z",
  termsVersion: "1",
};

export const destinations = [
  {
    id: "dest-th",
    code: "TH",
    name: "Thailand",
    slug: "thailand",
    courseCount: 3,
    followerCount: 12,
    tipsCount: 2,
    viewerIsFollowing: false,
  },
  {
    id: "dest-ae",
    code: "AE",
    name: "United Arab Emirates",
    slug: "united-arab-emirates",
    courseCount: 2,
    followerCount: 8,
    tipsCount: 1,
    viewerIsFollowing: false,
  },
  {
    id: "dest-tr",
    code: "TR",
    name: "Turkey",
    slug: "turkey",
    courseCount: 2,
    followerCount: 7,
    tipsCount: 1,
    viewerIsFollowing: false,
  },
  {
    id: "dest-us",
    code: "US",
    name: "United States",
    slug: "united-states",
    courseCount: 0,
    followerCount: 0,
    tipsCount: 0,
    viewerIsFollowing: false,
  },
];

type SmokeCourse = {
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

export const coursesByCountry: Record<string, SmokeCourse[]> = {
  TH: [
    {
      id: "course-th-black-mountain",
      name: "Black Mountain Golf Club",
      city: "Hua Hin",
      region: "Hua Hin",
      country: "TH",
      holes: 18,
      access: "PUBLIC",
      lat: 12.63,
      lon: 99.89,
    },
    {
      id: "course-th-siam-old",
      name: "Siam Country Club (Old Course)",
      city: "Pattaya",
      region: "Chonburi",
      country: "TH",
      holes: 18,
      access: "PUBLIC",
      lat: 12.91,
      lon: 100.98,
    },
    {
      id: "course-th-red-mountain",
      name: "Red Mountain Golf Club",
      city: "Phuket",
      region: "Phuket",
      country: "TH",
      holes: 18,
      access: "PUBLIC",
      lat: 7.91,
      lon: 98.34,
    },
  ],
  AE: [
    {
      id: "course-ae-emirates",
      name: "Emirates Golf Club",
      city: "Dubai",
      region: "Dubai",
      country: "AE",
      holes: 18,
      access: "PUBLIC",
      lat: 25.09,
      lon: 55.16,
    },
    {
      id: "course-ae-yas-links",
      name: "Yas Links Abu Dhabi",
      city: "Abu Dhabi",
      region: "Abu Dhabi",
      country: "AE",
      holes: 18,
      access: "PUBLIC",
      lat: 24.48,
      lon: 54.6,
    },
  ],
  TR: [
    {
      id: "course-tr-carya",
      name: "Carya Golf Club",
      city: "Belek",
      region: "Antalya",
      country: "TR",
      holes: 18,
      access: "PUBLIC",
      lat: 36.86,
      lon: 31.01,
    },
    {
      id: "course-tr-montgomerie",
      name: "The Montgomerie Maxx Royal",
      city: "Belek",
      region: "Antalya",
      country: "TR",
      holes: 18,
      access: "PUBLIC",
      lat: 36.84,
      lon: 31.07,
    },
  ],
};

export const allCourses = Object.values(coursesByCountry).flat();
