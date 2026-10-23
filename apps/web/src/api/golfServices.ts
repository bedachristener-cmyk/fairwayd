import { API_BASE } from "./base";

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
  venueProviders: {
    role: string;
    provider: {
      id: string;
      name: string;
      kind: string;
      website: string | null;
    };
  }[];
};

export type NearbyGolfServicesResponse = {
  count: number;
  radiusKm: number;
  truncated: boolean;
  items: GolfServiceVenue[];
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
  const url = new URL(`${API_BASE}/golf-services/nearby`);
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
