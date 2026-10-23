import { API_BASE } from "./base";

// A separate browser-only, loopback API for isolated Golf Near Me UI testing.
// Requires an explicit Vite DEV-only environment variable. Never changes the
// standard Fairwayd API_BASE or targets a remote Stage/Production service.
function golfServicesApiBase(): string {
  const override = String(import.meta.env.VITE_GOLF_SERVICES_LOCAL_TEST_API_BASE ?? "").trim();
  if (!override || !import.meta.env.DEV) return API_BASE;

  let value: URL;
  try {
    value = new URL(override);
  } catch {
    throw new Error("Invalid local Golf Services test API URL");
  }

  if (value.protocol !== "http:" || value.hostname !== "127.0.0.1" ||
      !value.port || value.pathname.replace(/\/$/, "") !== "/api" ||
      value.search || value.hash || value.username || value.password) {
    throw new Error("Golf Services test API must be an explicit 127.0.0.1 loopback URL");
  }

  return value.href.replace(/\/$/, "");
}

export type GolfServiceCategory =
  | "SIMULATOR"
  | "SHOP"
  | "RANGE"
  | "ACADEMY"
  | "FITTING";

export type GolfServiceOffering = {
  id: string;
  category: GolfServiceCategory;
  label: string | null;
  description: string | null;
  unitCount: number | null;
  availableToPublic: boolean | null;
  bookingUrl: string | null;
};

export type GolfServiceProviderLink = {
  role: string;
  provider: {
    id: string;
    name: string;
    kind: string;
    website: string | null;
  };
};

// Linked services never add a second public location or a new Course record.
export type GolfCourseServices = {
  courseId: string;
  offerings: GolfServiceOffering[];
  venueProviders: GolfServiceProviderLink[];
};

export type GolfServiceVenue = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  addressLine: string | null;
  lat: number | null;
  lon: number | null;
  website: string | null;
  phone: string | null;
  // Null is only used by explicitly labelled, unverified local pilot previews.
  distanceKm: number | null;
  offerings: GolfServiceOffering[];
  venueProviders: GolfServiceProviderLink[];
};

export type NearbyGolfServicesResponse = {
  count: number;
  radiusKm: number;
  truncated: boolean;
  items: GolfServiceVenue[];
  // Optional for graceful compatibility with API deployments predating Course links.
  courseServices?: GolfCourseServices[];
};

export type NearbyGolfServicesSearch = {
  lat: number;
  lon: number;
  radiusKm: 10 | 25 | 50 | 100;
  category?: GolfServiceCategory;
};

export class GolfServicesUnavailableError extends Error {
  readonly reason: "not-deployed" | "unavailable";

  constructor(reason: "not-deployed" | "unavailable") {
    super("The Golf Near Me directory is not available yet.");
    this.name = "GolfServicesUnavailableError";
    this.reason = reason;
  }
}

export async function getNearbyGolfServices(
  params: NearbyGolfServicesSearch,
  signal?: AbortSignal,
): Promise<NearbyGolfServicesResponse> {
  const url = new URL(`${golfServicesApiBase()}/golf-services/nearby`);
  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lon", String(params.lon));
  url.searchParams.set("radiusKm", String(params.radiusKm));
  if (params.category) url.searchParams.set("category", params.category);

  const response = await fetch(url, { signal });
  if (response.status === 404) {
    throw new GolfServicesUnavailableError("not-deployed");
  }
  if (response.status === 503) {
    throw new GolfServicesUnavailableError("unavailable");
  }
  if (!response.ok) {
    throw new Error("Golf services could not be loaded. Please try again.");
  }
  const data: NearbyGolfServicesResponse = await response.json();
  if (!data || !Array.isArray(data.items)) {
    throw new Error("Unexpected response from the golf services directory.");
  }
  return data;
}
